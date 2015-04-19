/**
 * ゲームメイン。
 * 
 * @author 2014/08 matsushima
 */

#pragma strict

/** ゲーム状態: タイトル */
static var STATE_TITLE: int = 0;
/** ゲーム状態: 開始 */
static var STATE_START: int = 1;
/** ゲーム状態: ゲーム中 */
static var STATE_RUNNING: int = 2;
/** ゲーム状態: 勝ち */
static var STATE_WIN: int = 3;
/** ゲーム状態: 負け */
static var STATE_LOSE: int = 4;

/** ゲーム状態 */
static var state: int = STATE_TITLE; // ゲーム状態: タイトル
/** デバッグテキスト */
static var debugTexts: Hashtable = new Hashtable();
/** プレーヤー */
var player: GameObject;
/** 対戦相手 */
var other: GameObject;
/** 地形 */
var terrain: Terrain;
/** テキストラベル */
var label: GUIText;
/** タイトル */
var title: GUITexture;

function Start () {

}

function Update () {
	switch (state) {
	case STATE_TITLE: // ゲーム状態: タイトル
		title.enabled = true;
		label.enabled = false;
		break;
	case STATE_START: // ゲーム状態: 開始
		label.text = "START";
		label.enabled = true;
		break;
	case STATE_RUNNING: // ゲーム状態: ゲーム中
		break;
	case STATE_WIN: // ゲーム状態: 勝ち
		label.text = "YOU WIN";
		label.enabled = true;
		break;
	case STATE_LOSE: // ゲーム状態: 負け
		label.text = "YOU LOSE";
		label.enabled = true;
		break;
	}
	// click or touch start
	if (Input.GetMouseButtonUp(0)
			|| (Input.touchCount > 0) && (TouchPhase.Ended == Input.GetTouch(0).phase)) {
		if (title.enabled) {
			state = STATE_START; // ゲーム状態: 開始
			title.enabled = false;
		} else if (label.enabled) {
			state = STATE_RUNNING; // ゲーム状態: ゲーム中
			// オブジェクト破棄
			for (var o: GameObject in GameObject.FindGameObjectsWithTag("Respawn")) {
				Destroy(o);
			}
			var ball: GameObject = GameObject.Find("ball(Clone)");
			if (null != ball) {
				Destroy(ball);
			}
			// テキストラベル非表示
			label.enabled = false;
			// 地形初期化。
			terrain.GetComponent(terrainScript).Init();
			// 砲台初期化。
			player.GetComponent(cannonScript).Init();
			other.GetComponent(cannonScript).Init();
		}
	}
}

function OnGUI() {
	// デバッグテキスト表示
	var y: int = 0;
	for (var k: Object in debugTexts.Keys) {
		GUI.Label(Rect(0, y * 20, 400, 20), debugTexts[k].ToString());
		++ y;
	}
}

static function Log(key: String, text: Object) {
	// デバッグテキスト表示登録
//	debugTexts[key] = text;
	// デバッグテキストログ出力
//	print(text);
}
