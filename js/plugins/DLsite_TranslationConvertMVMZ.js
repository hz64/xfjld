//=============================================================================
// DLsite_TranslationConvertMVMZ.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 翻訳テキストに自動でコンバートします(MV/MZ両対応)
 * @author DLsite
 * @help テキストを指定の翻訳文に動的に置き換えるプラグインです。
 * なるべくプラグインエディタの上部で読み込んで下さい。
 * 【ver1.05】
 * 
 * 制作者の許諾なく使用はしないで下さい。
 * You must not use this plugin without the author's permission.
 * 
 * 
 * 【対応しているプラグイン】
 * TextPicture.js
 * DestinationWindow.js
 * TorigoyaMZ_NotifyMessage.js
 * DTextPicture.js
 * SoR_GabWindow_MZ_Left.js
 * SoR_GabWindow_MZ_Right2.js
 * MNKR_TMLogWindowMZ.js
 * PH_Warehouse_MZ.js
 * RandomDungeon.js
 * 
 * 【TemplateEvent.js（トリアコンタン様）について】
 * 対応させたい場合は「TemplateEvent.js」より下に配置し、
 * パラメータを設定して下さい。
 * ※使用しない場合は設定をOFFにして下さい。
 * 
 * @param Accuracy
 * @desc true : スクリプトを一行全て置換する方式（より安全）
 * false: スクリプト内のテキストのみ置換する方式
 * @type boolean
 * @on スクリプト一行ごと
 * @off クオーテーションマーク
 * @default true
 * 
 * @param RandomDungeon
 * @text RandomDungeon対応
 * @type boolean
 * @default false
 * @desc RandomDungeon.jsがある場合ONにしてください。
 * 
 * @param TemplateEvent
 * @text テンプレートイベント
 * @desc 【TemplateEvent.js】を使用する場合は設定をONにして
 * テンプレートマップIDを入力して下さい
 * @type struct<TempEv>
 * @default {"useTemplateEv":"false","tempMapId":"1"}
 * 
 */


/*~struct~TempEv:
 * @param useTemplateEv
 * @text 使用するか
 * @desc 【TemplateEvent.js】を使用する場合はONにして下さい
 * @type boolean
 * @default false
 *
 * @param tempMapId
 * @text テンプレートマップID
 * @desc 【TemplateEvent.js】で設定されている
 * 「テンプレートマップID」と同じIDを入力して下さい
 * @type number
 * @min 1
 * @max 999
 * @default 1
 *
 * 
 */


(()=>{
    'use strict';

    //----------------------------------
    //設定項目
    //----------------------------------
    const getBoolean = ((str) => {
        return str === "true" ? true : false;
    });

    const PLUGIN_NAME = "DLsite_TranslationConvertMVMZ";
    const PARAM = PluginManager.parameters(PLUGIN_NAME);
    const CHOOSE_ACCURACY = getBoolean(String(PARAM["Accuracy"] || "").toLowerCase());
    const ENABLE_RANDOM_DUNGEON = getBoolean(String(PARAM["RandomDungeon"] || "").toLowerCase());

    const TEMP_EV_PLUGIN = {
        "UseTempEv" : getBoolean(JSON.parse(PARAM["TemplateEvent"])["useTemplateEv"].toLowerCase()),
        "TempMapId" : Number(JSON.parse(PARAM["TemplateEvent"])["tempMapId"])
    };

    //----------------------------------
    //ゲームエンジン
    //----------------------------------
    const IS_MZ = (() => {
        return Utils.RPGMAKER_NAME === "MZ";
    });

    //----------------------------------
    //処理開始
    //----------------------------------
    DataManager._databaseFiles.push({name: '$dataTranslation', src: 'DLsite_Translation.json'});

    //スクリプトに全角文字が含まれているか（含まれていない場合は文字置換をしない）
    const checkFullCharacter = ((str) => {
        const pattern = /[^\u0000-\u00ff]/;
        return pattern.test(str);
    });

    //テキストからダブルorシングルクォーテーションで囲まれた部分を抽出し、配列に格納
    const extractQuotedStrings = ((str) => {
        const pattern = /"([^"]*)"|'([^']*)'/g;
        let matches;
        const results = [];
        while ((matches = pattern.exec(str)) !== null) {
            results.push(matches[1] || matches[2]);
        }
        return results;
    });

    const replaceScript = ((scriptText) => {
        let isChanged = false;
        if (checkFullCharacter(scriptText)) {
            const jpTexts = extractQuotedStrings(scriptText);
            if (jpTexts) {
                jpTexts.forEach((text) => {
                    if (checkFullCharacter(text) && text in $dataTranslation) {
                        scriptText = scriptText.replace(text, $dataTranslation[text]);
                        isChanged = true;
                    }
                });
            }
        }
        return {"scriptText":scriptText, "isChanged":isChanged};
    });

    const setObjData = ((obj, property) => {
        if (obj && obj[property] && obj[property] in $dataTranslation) {
            obj[property] = $dataTranslation[obj[property]];
            if (property === "note") {
                DataManager.extractMetadata(obj);
            }
        }
    });

    const setArrayData = ((array) => {
        if (array.length > 0) {            
            for (let i = 0; i < array.length; i++) {
                if (array[i] in $dataTranslation) {
                    array[i] = $dataTranslation[array[i]];
                }
            }
        }
    });

    const setObjDataOnBasicDatabase = ((data) => {
        if (data) {
            data.forEach((obj) => {
                setObjData(obj, "name");
                setObjData(obj, "nickname");
                setObjData(obj, "profile");
                setObjData(obj, "note");//メタデータの生成に必要
                setObjData(obj, "description");
                setObjData(obj, "message1");
                setObjData(obj, "message2");
                setObjData(obj, "message3");
                setObjData(obj, "message4");
            });
        }
    });

    const setObjDataOnSystem = ((data) => {
        if (data) {
            setObjData(data, "gameTitle");
            setObjData(data, "currencyUnit");
            setArrayData(data.armorTypes);
            setArrayData(data.elements);
            setArrayData(data.equipTypes);
            setArrayData(data.skillTypes);
            setArrayData(data.terms.basic);
            setArrayData(data.terms.commands);
            setArrayData(data.terms.params);
            const keyArray = Object.keys(data.terms.messages);
            keyArray.forEach((key) => {
                setObjData(data.terms.messages, key);
            });
            setArrayData(data.weaponTypes);
        }
    });

    const getNextEventCode = ((array, nextIndex) => {
        return array[nextIndex].code ? array[nextIndex].code : 0;
    });

    
    const setTroops = ((data) => {
        if (data) {
            data.forEach((obj) => {
                if (obj && obj.pages) {
                    setEvents(obj.pages);
                }
            });
        }
    });

    const setEvents = ((data) => {
        if (data) {
            data.forEach((obj) => {
                if (obj && obj.list) {
                    setEventList(obj.list);
                }
            });
        }
    });

    const setMapEvents = ((data) => {
        if (data) {
            if (data.displayName && data.displayName in $dataTranslation) {
                data.displayName = $dataTranslation[data.displayName];
            }
            setObjData(data, "note");
            if (data.events) {
                data.events.forEach((event) => {
                    if (event) {
                        setObjData(event, "note");
                        if (event.pages) {
                            event.pages.forEach((page) => {
                                if (page && page.list) {
                                    setEventList(page.list);
                                }
                            });
                        }
                    }
                });
            }
        }
    });

    const setEventList = ((eventList) => {
        let _index = 0;
        let _allText = "";
        let _allTextTr = "";
        let _count = 0;

        const checkScriptText = ((str) => {
            return str && checkFullCharacter(str) && str in $dataTranslation;
        });

        for (_index = 0; _index < eventList.length; _index++) {
            if (eventList[_index]) {
                const params = eventList[_index].parameters;
                switch (eventList[_index].code) {
                    case 101://MZの名前入力欄
                        if (IS_MZ() && Array.isArray(params) && params.length > 4) {
                            if (params[4] in $dataTranslation) {
                                params[4] = $dataTranslation[params[4]];
                            }
                        }
                        break;
                    case 401://文章の表示
                        let originalTexts = [];
                        let trTexts = [];
                        let indent101 = 0;
                        let param101 = [];
                        if (getNextEventCode(eventList, _index - 1) === 101) {
                            indent101 = eventList[_index - 1].indent;
                            param101 = eventList[_index - 1].parameters;
                        } else {
                            //通常ここはあり得ないが、もし異なっている場合はbreakする
                            break;
                        }
                        _count = 0;
                        while (getNextEventCode(eventList, _count + _index) === 401) {
                            originalTexts.push(eventList[_count + _index].parameters[0]);
                            _count++;
                        }
                        _allText = originalTexts.join("\n");
                        if (_allText in $dataTranslation) {
                            _allTextTr = $dataTranslation[_allText];
                            trTexts = _allTextTr.split("\n");//n行目が空の文字列なら""が配列に入る
                            if (originalTexts.length === trTexts.length) {
                                //最もシンプルな処理
                                for (let i = 0; i < trTexts.length; i++) {
                                    eventList[_index].parameters[0] = trTexts[i];
                                    _index++;
                                }
                            } else if (originalTexts.length > trTexts.length) {
                                //超過した分は空の文字列を代入
                                for (let i = 0; i < originalTexts.length; i++) {
                                    if (i < trTexts.length) {
                                        eventList[_index].parameters[0] = trTexts[i];
                                    } else {
                                        eventList[_index].parameters[0] = "";
                                    }
                                    _index++;
                                }
                            } else {
                                //新しくコードを追加する
                                let pos = 0;
                                
                                //日本語にある分まではそのままでOK
                                for (let i = 0; i < originalTexts.length; i++) {
                                    eventList[_index].parameters[0] = trTexts[i];
                                    _index++;
                                    pos++;
                                }
                                for (let i = originalTexts.length; i < trTexts.length; i++) {
                                    if (pos >= 4) {
                                        pos = 0;
                                        const object101 = {
                                            "code": 101,
                                            "indent": indent101,
                                            "parameters": param101
                                        };
                                        eventList.splice(_index, 0, object101);
                                        _index++;
                                    } 
                                    const object401 = {
                                        "code": 401,
                                        "indent": indent101,
                                        "parameters": []
                                    };
                                    eventList.splice(_index, 0, object401);
                                    eventList[_index].parameters[0] = trTexts[i];
                                    _index++;
                                    pos++;
                                }
                            }
                            _index--;//インデックスがこの後インクリメントされるので、デクリメントしておきます
                        } else {
                            /*
                            ■置換テキストがないので続く401の処理は実行しない
                            置換テキストがない場合、whileでのテキスト取得時にカウンタ（_count）が1つ余分に進んでしまっているので、-1します。
                            ※直後のcodeが102（選択肢）など置換に関わる場合、正常に置き換わらなくなります。
                            */
                            _index += _count - 1;
                        }
                        break;
                    case 405://スクロールテキスト
                        let originalTexts405 = [];
                        let trTexts405 = [];
                        let indent105 = 0;
                        if (getNextEventCode(eventList, _index - 1) === 105) {
                            indent105 = eventList[_index - 1].indent;
                        } else {
                            break;
                        }
                        _count = 0;
                        while (getNextEventCode(eventList, _count + _index) === 405) {
                            originalTexts405.push(eventList[_count + _index].parameters[0]);
                            _count++;
                        }
                        _allText = originalTexts405.join("\n");
                        if (_allText in $dataTranslation) {
                            _allTextTr = $dataTranslation[_allText];
                            trTexts405 = _allTextTr.split("\n");
                            if (originalTexts405.length === trTexts405.length) {
                                for (let i = 0; i < trTexts405.length; i++) {
                                    eventList[_index].parameters[0] = trTexts405[i];
                                    _index++;
                                }
                            } else if (originalTexts405.length > trTexts405.length) {
                                for (let i = 0; i < originalTexts405.length; i++) {
                                    if (i < trTexts405.length) {
                                        eventList[_index].parameters[0] = trTexts405[i];
                                    } else {
                                        eventList[_index].parameters[0] = "";
                                    }
                                    _index++;
                                }
                            } else {
                                for (let i = 0; i < originalTexts405.length; i++) {
                                    eventList[_index].parameters[0] = trTexts405[i];
                                    _index++;
                                }
                                for (let i = originalTexts405.length; i < trTexts405.length; i++) {
                                    const object405 = {
                                        "code": 405,
                                        "indent": indent105,
                                        "parameters": [trTexts405[i]]
                                    };
                                    eventList.splice(_index, 0, object405);
                                    _index++;
                                }
                                _index++;//インデックスを合わせるため、インクリメントします
                            }
                            _index--;
                        } else {
                            //置換テキストがないので続く405の処理は実行しない
                            _index += _count - 1;
                        }
                        break;
                    case 102://選択肢の配列
                        setArrayData(params[0]);
                        break;
                    case 402://選択肢の選択
                        if (params[1] in $dataTranslation) {
                            params[1] = $dataTranslation[params[1]];
                        }
                        break;
                    case 122://変数の操作
                        if (params[3] === 4) {
                            if (CHOOSE_ACCURACY) {
                                if (params[4] in $dataTranslation) {
                                    params[4] = $dataTranslation[params[4]];
                                }
                            } else {
                                if (params[4] && replaceScript(params[4]).isChanged) {
                                    params[4] = replaceScript(params[4]).scriptText;
                                }
                            }
                        }
                        break;
                    case 111://条件分岐
                        if (params[0] === 12) {
                            if (CHOOSE_ACCURACY) {
                                if (params[1] in $dataTranslation) {
                                    params[1] = $dataTranslation[params[1]];
                                }
                            } else {
                                if (params[1] && replaceScript(params[1]).isChanged) {
                                    params[1] = replaceScript(params[1]).scriptText;
                                }
                            }
                        }
                        break;
                    case 108://コメント
                        let originalTexts108 = [];
                        originalTexts108.push(params[0]);
                        let trTexts108 = [];
                        let indent108 = eventList[_index].indent;
                        _count = 1;
                        while (getNextEventCode(eventList, _count + _index) === 408) {
                            originalTexts108.push(eventList[_count + _index].parameters[0]);
                            _count++;
                        }
                        _allText = originalTexts108.join("\n");
                        if (_allText in $dataTranslation) {
                            _allTextTr = $dataTranslation[_allText];
                            trTexts108 = _allTextTr.split("\n");
                            if (originalTexts108.length === trTexts108.length) {
                                for (let i = 0; i < trTexts108.length; i++) {
                                    eventList[_index].parameters[0] = trTexts108[i];
                                    _index++;
                                }
                            } else if (originalTexts108.length > trTexts108.length) {
                                for (let i = 0; i < originalTexts108.length; i++) {
                                    if (i < trTexts108.length) {
                                        eventList[_index].parameters[0] = trTexts108[i];
                                    } else {
                                        eventList[_index].parameters[0] = "";
                                    }
                                    _index++;
                                }
                            } else {
                                let pos = 0;
                                for (let i = 0; i < originalTexts108.length; i++) {
                                    eventList[_index].parameters[0] = trTexts108[i];
                                    _index++;
                                    pos++;
                                }
                                for (let i = originalTexts108.length; i < trTexts108.length; i++) {
                                    if (pos >= 6) {
                                        pos = 0;
                                        const object108 = {
                                            "code": 108,
                                            "indent": indent108,
                                            "parameters": [trTexts108[i]]
                                        };
                                        eventList.splice(_index, 0, object108);
                                    } else {
                                        const object408 = {
                                            "code": 408,
                                            "indent": indent108,
                                            "parameters": [trTexts108[i]]
                                        };
                                        eventList.splice(_index, 0, object408);
                                    }
                                    _index++;
                                    pos++;
                                }
                            }
                            _index--;
                        } else {
                            /*
                            ■置換テキストがないので続く408の処理は実行しない
                            カウンタ変数の初期値が1なので-1しておきます
                            ※文章（code401）と異なり、注釈の場合は最初の行がcode108となるためカウンタ初期値を変えています。
                            */
                            _index = _index + _count - 1;
                        }
                        break;
                    case 408://108で処理しているので設定不要
                        break;
                    case 320://名前の変更
                    case 324://二つ名の変更
                    case 325://プロフィールの変更
                        if (params[1] in $dataTranslation) {
                            params[1] = $dataTranslation[params[1]];
                        }
                        break;
                    case 355://スクリプト
                        if (CHOOSE_ACCURACY) {
                            //スクリプトを一行一行評価する場合
                            let scriptText = params[0];
                            if (checkScriptText(scriptText)) {
                                scriptText = $dataTranslation[scriptText];
                                params[0] = scriptText;
                            }
                            _index++;
                            while (getNextEventCode(eventList, _index) === 655) {
                                scriptText = eventList[_index].parameters[0];
                                if (checkScriptText(scriptText)) {
                                    scriptText = $dataTranslation[scriptText];
                                    eventList[_index].parameters[0] = scriptText;
                                }
                                _index++;
                            }
                        } else {
                            //Translateと同じ処理にする場合
                            let scriptText = params[0];
                            if (scriptText && replaceScript(scriptText).isChanged) {
                                params[0] = replaceScript(scriptText).scriptText;
                            }
                            _index++;
                            while (getNextEventCode(eventList, _index) === 655) {
                                scriptText = eventList[_index].parameters[0];
                                if (scriptText && replaceScript(scriptText).isChanged) {
                                    eventList[_index].parameters[0] = replaceScript(scriptText).scriptText;
                                }
                                _index++;
                            }
                        }
                        _index--;
                        break;
                    case 655://355で処理しているので設定不要
                        break;
                    case 356://プラグインコマンド（MV）※MZでもこのcodeは使用可能
                        if (params[0] in $dataTranslation) {
                            params[0] = $dataTranslation[params[0]];
                        }
                        break;
                    case 357://プラグインコマンド（MZ）
                                        
                        if (IS_MZ() && Array.isArray(params) && params.length >= 4) {

                            //PH_Warehouse_MZ特別対応
                            //翻訳前の値が必要なため、kvp置換よりも前に置いています。（kvpよりも後ろに配置する場合はコード書き換えの必要あり)
                            if (params[0] === "PH_Warehouse_MZ"){
                                const commandKey = "title";
                                updatePHWarehouse(params[3][commandKey]);
                            }

                            //以下は汎用の処理
                            const replaceSimpleText = ((value) => {
                                if (params[1] in value) {
                                    const commandKey = value[params[1]];
                                    if (commandKey in params[3] && params[3][commandKey] in $dataTranslation) {
                                        params[3][commandKey] = $dataTranslation[params[3][commandKey]];
                                    }

                                }
                            });
                            //シンプルなテキストの置き換えが可能なプラグイン
                            const kvp = kvpForSimpleTextMZ();
                            Object.keys(kvp).forEach((key) => {
                                if (params[0] === key) {
                                    replaceSimpleText(kvp[key]);
                                }
                            });

                        }
                        break;
                }
            }
        }
    });

    //---------------------------
    // Plugin for MZ
    //---------------------------
    const kvpForSimpleTextMZ = (() => {
        const kvp = {
            //"プラグイン名" : {"コマンド名":"置き換えたいテキストがある引数名"}
            "TextPicture" : {
                "set" : "text"
            },
            "DestinationWindow" : {
                "SET_DESTINATION" : "destination"
            },
            "TorigoyaMZ_NotifyMessage": {
                "notify" : "message",
                "notifyWithVariableIcon" : "message"
            },
            "DTextPicture" : {
            	"dText" : "text"
            },
            "SoR_GabWindow_MZ_Left" : {
            	"PushGab" : "arg1"
            },
            "SoR_GabWindow_MZ_Right2" : {
            	"PushGab" : "arg1"
            },
            "MNKR_TMLogWindowMZ" : {
            	"addLog" : "text"
            },
            "PH_Warehouse_MZ" : {
            	"Show" : "title"
            },
        };
        return kvp;
    });

    //---------------------------
    // Scene_Boot
    //---------------------------
    const _Scene_Boot_terminate = Scene_Boot.prototype.terminate;
    Scene_Boot.prototype.terminate = function() {
        _Scene_Boot_terminate.call(this);
        if ($dataTranslation) {
            setObjDataOnBasicDatabase($dataActors);
            setObjDataOnBasicDatabase($dataArmors);
            setObjDataOnBasicDatabase($dataItems);
            setObjDataOnBasicDatabase($dataWeapons);
            setObjDataOnBasicDatabase($dataClasses);//習得スキル欄のメモはmetaに関係しない
            setObjDataOnBasicDatabase($dataSkills);
            setObjDataOnBasicDatabase($dataEnemies);
            setObjDataOnBasicDatabase($dataStates);
            setObjDataOnSystem($dataSystem);
            //敵グループ・コモンイベント
            setTroops($dataTroops);
            setEvents($dataCommonEvents);
        }        
    };

    //---------------------------
    // Scene_Map
    //---------------------------
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if ($dataMap && $dataTranslation) {
            setMapEvents($dataMap);
            this._mapNameWindow.open();
        }
    };

    //---------------------------
    //TemplateEvent.jsへの対応
    //---------------------------
    if (TEMP_EV_PLUGIN.UseTempEv && typeof $dataTemplateEvents !== 'undefined') {
        Scene_Boot.prototype.templateMapLoadGenerator = function* () {
            while (!DataManager.isMapLoaded()) {
                yield false;
            }
            // Resolve conflict for OnlineAvatar.js
            if (!$gamePlayer) {
                $gamePlayer = {isTransferring: function() {}};
            }
            const tempMapId = TEMP_EV_PLUGIN.TempMapId;
            DataManager.loadMapData(tempMapId);
            $gamePlayer = null;
            while (!DataManager.isMapLoaded()) {
                yield false;
            }
            $dataTemplateEvents = $dataMap.events;
            $dataMap            = {};
            $dataTemplateEvents.forEach((event) => {
                if (event) {
                    setObjData(event, "note");
                    if (event.pages) {
                        event.pages.forEach((page) => {
                            if (page && page.list) {
                                setEventList(page.list);
                            }
                        });
                    }
                }
            });
            return true;
        };
    }

    //---------------------------
    //PH_Warehouse_MZ.jsへの対応（kvpのみでは対応できない追加更新処理）
    //引数のtitleには翻訳前のキー名称が入ることを想定しています。
    //---------------------------
    const updatePHWarehouse = (title) => {
        const warehouses = PHPlugins.PHWarehouse._warehouses;
        if (title in warehouses){
            const warehouseObject = warehouses[title]; //翻訳前のキーに対応するオブジェクト
            const translatedTitle = $dataTranslation[title]; //翻訳後のキー名称
            //オブジェクトのキー名を翻訳後の内容に置き換える
            warehouses[translatedTitle] = warehouseObject; //翻訳後のキーに元々あったオブジェクトを紐づける
            delete warehouses[title]; //旧キー（プロパティ）を削除

            //念のためtitleも翻訳後に書き換え（これをしなくても動きはするものの、未知の不具合があるかもしれないので）
            warehouses[translatedTitle].title = translatedTitle;
        }
    };

    //---------------------------
    //RandomDungeon.jsへの対応（オプションで切り替え可能）
    //---------------------------
    if(ENABLE_RANDOM_DUNGEON){
        const _Game_Event_initialize = Game_Event.prototype.initialize;
        Game_Event.prototype.initialize = function(mapId, eventId, event=null) {
            _Game_Event_initialize.call(this, mapId, eventId, event);
            if (event) {
                setObjData(event, "note");
                if (event.pages) {
                    event.pages.forEach((page) => {
                        if (page && page.list) {
                            setEventList(page.list);
                        }
                    });
                }
            }
        }
    }
})();