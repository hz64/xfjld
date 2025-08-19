//=============================================================================
// main.js
//=============================================================================

PluginManager.setup($plugins);

//================= 加载进度条 Hook =================
(function() {
    const loadingScreen = document.getElementById("loading-screen");
    const progressFill = document.getElementById("progress-fill");

    // 百分比文本
    const percentText = document.createElement("div");
    percentText.style.marginTop = "8px";
    percentText.style.fontSize = "14px";
    percentText.innerText = "0%";
    loadingScreen.appendChild(percentText);

    // 剩余文件数文本
    const remainText = document.createElement("div");
    remainText.style.marginTop = "4px";
    remainText.style.fontSize = "12px";
    remainText.style.opacity = "0.8";
    remainText.innerText = "剩余文件数: 0";
    loadingScreen.appendChild(remainText);

    let total = 0;
    let loaded = 0;
    let finished = false;

    function updateProgress() {
        if (total === 0) return;
        const percent = Math.floor((loaded / total) * 100);
        progressFill.style.width = percent + "%";
        percentText.innerText = percent + "%";
        remainText.innerText = "剩余文件数: " + (total - loaded);

        if (percent >= 100 && !finished) {
            finished = true;
            // 平滑淡出加载界面
            loadingScreen.style.transition = "opacity 0.5s";
            loadingScreen.style.opacity = "0";
            setTimeout(() => {
                loadingScreen.style.display = "none";
            }, 500);
        }
    }

    // === Hook 图片加载 (Bitmap) ===
    const _Bitmap_initialize = Bitmap.prototype.initialize;
    Bitmap.prototype.initialize = function(src) {
        if (src) {
            total++;
            const img = new Image();
            img.onload = () => { loaded++; updateProgress(); };
            img.onerror = () => { loaded++; updateProgress(); };
            img.src = src;
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

// 禁用默认 Now Loading，避免覆盖自定义进度条
Graphics.printLoading = function() {};
