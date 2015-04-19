/**
 * 砲弾。
 * 
 * @author 2014/08 matsushima
 */

#pragma strict

/** 発射元の砲台 */
var cannon: Transform;

function Start () {

}

function Update () {
	// 高さ < 0 なら破棄
	cannon.GetComponent(cannonScript).ballPosition = transform.position;
	if (transform.position.y < 0) {
		Destroy(gameObject);
	}
}

function OnCollisionEnter(collision: Collision) {
	MainScript.Log("ball collision", "ball collision: " + collision.gameObject.name + "," + collision.contacts[0].point);
	// 地形なら破棄
	if ("Terrain" == collision.gameObject.name) {
		Destroy(gameObject, 3); // 3秒後に破棄
	}
}

function OnDestroy() {
	// 破棄されたら砲台側の砲弾生存フラグをクリア
	if (null != cannon) {
		cannon.GetComponent(cannonScript).ballExists = false; // 砲弾存在
	}
}
