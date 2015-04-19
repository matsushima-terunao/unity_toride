/**
 * 砲台。
 * 
 * @author 2014/08 matsushima
 */

#pragma strict

var BALL_FORCE: float = 1750;

/** 砲弾 */
var ballPrefab: GameObject;
/** 爆発 */
var particlePrefab: GameObject;
/** 地形 */
var terrain: Terrain;
var touchPad: GUITexture;

/** 砲弾存在 */
var ballExists: boolean = false;
/** 砲弾位置 */
var ballPosition: Vector3;

/** マウスボタン */
var mouseDown: boolean = false;
/** マウスボタン */
var mouseOnPlayer: boolean;
/** マウス位置 */
var mousePos: Vector3;
/** タッチ */
var touchDown: boolean = false;
/** タッチ */
var touchOnPlayer: boolean;
/** タッチ位置 */
var touchPos: Vector3;
/** タッチピンチ距離 */
var touchDistance: float;

function Start () {
	Camera.main.transform.LookAt(Vector3(terrain.terrainData.size.x / 2, 0, terrain.terrainData.size.z / 2));
}

function Update () {
	if (MainScript.STATE_RUNNING != MainScript.state) { // not ゲーム状態: ゲーム中
		touchDown = false;
		return;
	}
	var inputResolution: float = 90.0 / Mathf.Min(Screen.width, Screen.height); // 操作回転量: 画面短辺 -> 90度
	var inputDistance: Vector3 = Vector3.zero; // 入力移動量
	var fire: boolean = false; // 発射
	if (gameObject.CompareTag("Player")) {
		// 自分
		// mouse drag: 移動量を求める
		var mousePosPrev: Vector3 = mousePos;
		mousePos = Input.mousePosition;
		if (mouseDown) {
			inputDistance = mousePos - mousePosPrev;
		}
		// mouse down
		if (Input.GetMouseButtonDown(0)) {
			mouseDown = true;
			// player 上判定
			var hit: RaycastHit;
			var ray: Ray = Camera.main.ScreenPointToRay(mousePos);
			mouseOnPlayer = (Physics.Raycast(ray, hit, 100)
				&& (gameObject == hit.collider.gameObject || hit.collider.transform.IsChildOf(transform)));
			// タッチパッド上判定
			mouseOnPlayer = mouseOnPlayer || touchPad.HitTest(mousePos, Camera.main);
		}
		// mouse up: 発射
		if (Input.GetMouseButtonUp(0)) {
			fire = mouseOnPlayer;
			mouseDown = false;
		}
		// mouse wheel: ズーム
		inputDistance.z = Input.GetAxis("Mouse ScrollWheel") * 10;
		// touch
		var touchPosPrev: Vector3 = touchPos;
		if (1 == Input.touchCount) {
			var touch:Touch = Input.GetTouch(0);
			switch (touch.phase) {
			// touch down
			case TouchPhase.Began:
				touchDown = true;
				touchPos = touch.position;
				// player 上判定
				ray = Camera.main.ScreenPointToRay(mousePos);
				touchOnPlayer = (Physics.Raycast(ray, hit, 100)
					&& (gameObject == hit.collider.gameObject || hit.collider.transform.IsChildOf(transform)));
				break;
			// touch swipe: 移動量を求める
			case TouchPhase.Moved:
				touchPos = touch.position;
				inputDistance = touchPos - touchPosPrev;
				break;
			// touch up: 発射
			case TouchPhase.Ended:
				fire = touchDown;
				touchDown = false;
				touchPos = touch.position;
				if (fire) {
					inputDistance = touchPos - touchPosPrev;
				}
				break;
			}
		} else if (Input.touchCount >= 2) {
			// touch pinch: ズーム
			touchDown = false;
			var touch0:Touch = Input.GetTouch(0);
			var touch1:Touch = Input.GetTouch(1);
			if (TouchPhase.Began == touch1.phase) {
				touchPos.z = Vector2.Distance(touch0.position, touch1.position);
			} else if (TouchPhase.Moved == touch0.phase || TouchPhase.Moved == touch1.phase) {
				touchPos.z = Vector2.Distance(touch0.position, touch1.position);
				inputDistance = Vector3(0, 0, -(touchPos.z - touchPosPrev.z) / 10);
			}
		}
		// mouse or touch 移動量 -> 回転
		// 縦方向: x軸回転
		// 横方向: y軸回転
		if (Vector3.zero != inputDistance) {
			if (mouseOnPlayer) {
				var angle: Vector3 = transform.eulerAngles - Vector3(inputDistance.y, inputDistance.x, 0) * inputResolution;
				angle.x = Mathf.Max(0, Mathf.Min(80, angle.x));
				angle.y = Mathf.Max(80, Mathf.Min(190, (angle.y + 180) % 360)); // -100..10
				angle.y = (angle.y + 180) % 360;
				transform.eulerAngles = angle;
				MainScript.Log("eulerAngles", "eulerAngles=" + angle + "," + transform.eulerAngles);
			} else {
				// 地形の中心からカメラへのベクトル
				var terrainPos: Vector3 = Vector3(terrain.terrainData.size.x / 2, 0, terrain.terrainData.size.z / 2);
				var pos: Vector3 = Camera.main.transform.position - terrainPos;
				// 極座標に変換
				var a: float = Mathf.Atan2(pos.z, pos.x);
				var b: float = Mathf.Atan2(pos.y, Mathf.Sqrt(pos.x * pos.x + pos.z * pos.z));
				var c: float = Mathf.Sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
				// 回転、ズーム
				a -= inputDistance.x * inputResolution / 30;
				b = Mathf.Max(0, Mathf.Min(Mathf.PI / 2.1, b - inputDistance.y * inputResolution / 30));
				c = Mathf.Max(terrainPos.x, c + inputDistance.z);
				// 直交座標に変換
				pos.x = c * Mathf.Cos(b) * Mathf.Cos(a);
				pos.z = c * Mathf.Cos(b) * Mathf.Sin(a);
				pos.y = c * Mathf.Sin(b);
				Camera.main.transform.position = pos + terrainPos;
				Camera.main.transform.LookAt(terrainPos);
			}
		}
	} else {
		// 相手
		if (!ballExists) { // not 砲弾存在
			var player: GameObject = GameObject.FindGameObjectWithTag("Player");
			// 横回転量 = (プレイヤーとの角度 - 砲弾との角度) / 2 + ランダム
			var playerAngle: float = Mathf.Atan2(
				player.transform.position.z - transform.position.z,
				player.transform.position.x - transform.position.x) * 180 / Mathf.PI;
			var ballAngle: float = Mathf.Atan2(
				ballPosition.z - transform.position.z,
				ballPosition.x - transform.position.x) * 180 / Mathf.PI;
			inputDistance.y -= (playerAngle - ballAngle) / 2 + Random.value * 2 - 1;
			// 縦回転量 = (プレイヤーとの距離 - 砲弾との距離) / 10 + ランダム
			var distance: float = (player.transform.position - transform.position).magnitude
				- (ballPosition - transform.position).magnitude;
			inputDistance.x += distance / 10 + Random.value * 2 - 1;
			// 回転
			transform.eulerAngles += Vector3(inputDistance.x, inputDistance.y, 0);
			// 発射。
			fire = true;
		}
	}
	// 発射。
	if (fire && !ballExists) {
		// 砲弾ベクトル
		var ballVector = Vector3.zero;
		ballVector.x = Mathf.Sin(2 * Mathf.PI * transform.eulerAngles.x / 360) * Mathf.Sin(2 * Mathf.PI * transform.eulerAngles.y / 360);
		ballVector.z = Mathf.Sin(2 * Mathf.PI * transform.eulerAngles.x / 360) * Mathf.Cos(2 * Mathf.PI * transform.eulerAngles.y / 360);
		ballVector.y = Mathf.Cos(2 * Mathf.PI * transform.eulerAngles.x / 360);
		// インスタンスの生成
		var ball: GameObject = Instantiate(ballPrefab, transform.FindChild("Cylinder").position + ballVector * 5, Quaternion.identity);
		ballExists = true;
		// 力を加える
		ball.GetComponent.<Rigidbody>().AddForce(ballVector * BALL_FORCE);
		MainScript.Log("AddForce", "AddForce=" + ballVector * BALL_FORCE + "," + (ballVector * BALL_FORCE).magnitude);
		// 発射元の砲台
		ball.GetComponent(ballScript).cannon = transform;
	}
}

function OnCollisionEnter(collision: Collision) {
	MainScript.Log("cannon collision", "cannon collision: " + collision.gameObject.name + "," + collision.contacts[0].point);
	if ("ball(Clone)" == collision.gameObject.name) {
		// ヒット。
		Destroy(collision.gameObject);
		Hit();
	}
}

/**
 * 初期化。
 */
function Init() {
	ballExists = false;
	mouseOnPlayer = false;
	mouseDown = false;
	touchDown = false;
	// 砲台角度・位置
	if (gameObject.CompareTag("Player")) {
		// プレイヤー
		transform.eulerAngles = Vector3(45, 315, 0);
		transform.position.x = 90 - 20 * Random.value;
		transform.position.z = 10 + 20 * Random.value;
	} else {
		// 対戦相手
		transform.eulerAngles = Vector3(45, 135, 0);
		ballPosition = Vector3(100 * Random.value, 0, 100 * Random.value);
		transform.position.x = 10 + 20 * Random.value;
		transform.position.z = 90 - 20 * Random.value;
	}
	// 砲台の地形の高さ
	transform.position.y = terrain.terrainData.GetHeight(
		transform.position.x * terrain.terrainData.heightmapWidth / terrain.terrainData.size.x,
		transform.position.z * terrain.terrainData.heightmapHeight / terrain.terrainData.size.z);
	MainScript.Log("height", "height=" + transform.position.y);
 	// 砲台表示
	gameObject.SetActive(true);
}

/**
 * ヒット。
 */
function Hit() {
 	// 砲台非表示
	gameObject.SetActive(false);
	// 破壊エフェクト。
	var particle: GameObject = Instantiate(particlePrefab, transform.position, Quaternion.identity); // インスタンスの生成
	particle.tag = "Respawn";
	// 勝ち負け
	if (MainScript.STATE_RUNNING == MainScript.state) {
		MainScript.state = (gameObject.CompareTag("Player") ? MainScript.STATE_LOSE : MainScript.STATE_WIN);
	}
}
