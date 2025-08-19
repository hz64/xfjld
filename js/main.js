//=============================================================================
// main.js
//=============================================================================

PluginManager.setup($plugins);

//================= 加载进度条 Hook =================
(function() {
    const progressFill = document.getElementById("progress-fill");
    const loadingScreen = document.getElementById("loading-screen");

    // 新增：百分比文本
    const percentText = document.createElement("div");
    percentText.style.marginTop = "8px";
    percentText.style.fontSize = "14px";
    percentText.innerText = "0%";
    loadingScreen.appendChild(percentText);

    let total = 0;    // 总资源数
    let loaded = 0;   // 已加载资源数
    let finished = false;

    function updateProgress() {
        if (total === 0) return;
        const percent = Math.floor((loaded / total) * 100);
        progressFill.style.width = percent + "%";
        percentText.innerText = percent + "%";
        if (percent >= 100 && !finished) {
            finished = true;
            setTimeout(() => {
                loadingScreen.style.display = "none";
            }, 300);
        }
    }

    // === Hook 图片加载 (Bitmap) ===
    const _Bitmap_initialize = Bitmap.prototype.initialize;
    Bitmap.prototype.initialize = function(src) {
        if (src) {
            total++;
            const image = new Image();
            image.onload = () => { loaded++; updateProgress(); };
            image.onerror = () => { loaded++; updateProgress(); };
            image.src = src;
        }
        _Bitmap_initialize.apply(this, arguments);
    };

    // === Hook 音频加载 (AudioManager) ===
    const _AudioManager_createBuffer = AudioManager.createBuffer;
    AudioManager.createBuffer = function(folder, name) {
        if (name) {
            total++;
            const url = this._path + folder + "/" + encodeURIComponent(name) + this.audioFileExt();
            const audio = new Audio();
            audio.oncanplaythrough = () => { loaded++; updateProgress(); };
            audio.onerror = () => { loaded++; updateProgress(); };
            audio.src = url;
        }
        return _AudioManager_createBuffer.apply(this, arguments);
    };

    // === Hook 数据加载 (DataManager) ===
    const _DataManager_loadDataFile = DataManager.loadDataFile;
    DataManager.loadDataFile = function(name, src) {
        total++;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", src);
        xhr.overrideMimeType("application/json");
        xhr.onload = () => { loaded++; updateProgress(); };
        xhr.onerror = () => { loaded++; updateProgress(); };
        xhr.send();
        return _DataManager_loadDataFile.apply(this, arguments);
    };
})();

//================= 游戏启动 =================
window.onload = function() {
    SceneManager.run(Scene_Boot);
};
