/**
 * 地形。
 * 
 * @author 2014/08 matsushima
 */

#pragma strict

/** 変更前の高さマップ */
var heightsOrg: float[,];
/** 高さマップ */
var heights: float[,]; // 高さマップ
/** 爆発 */
var particlePrefab: GameObject;
/** プレーヤー */
var player: GameObject;
/** 対戦相手 */
var other: GameObject;

function Start () {
	var terrain: Terrain = gameObject.GetComponent(Terrain);
	var w: int = terrain.terrainData.heightmapWidth;
	var h: int = terrain.terrainData.heightmapHeight;
	Debug.Log("w=" + w + ",h=" + h);
	heightsOrg = terrain.terrainData.GetHeights(0, 0, w, h); // 変更前の高さマップ
	heights = terrain.terrainData.GetHeights(0, 0, w, h); // 高さマップ
}

function Update () {

}

var elem_cnt: int = 64; // 要素数

/**
 * 初期化。
 */
function Init() {
	var terrain: Terrain = gameObject.GetComponent(Terrain);
	var w: int = terrain.terrainData.heightmapWidth;
	var h: int = terrain.terrainData.heightmapHeight;
	Debug.Log("w=" + w + ",h="  + h);
	fractal(512, 1.5, 0.3, heights);
	terrain.terrainData.SetHeights(0, 0, heights);
}

function fractal2(n: int, h: float, height: float, buf: float[,]) {
	var x: int;
	var y: int;
	for (x = 0; x < n; ++ x) {
		for (y = 0; y < n; ++ y) {
			//buf[x, y] = Mathf.Sin(y * 2 * 3.14 / 500) / 1.0 + 1;
			buf[x, y] = (x / 10 + y / 10) % 2 * height;
		}
	}
}

/**
 * フラクタル生成。
 * 
 * @param n 要素数
 * @param h フラクショナルブラウン運動(fBm)のハースト定数
 * @param height 要素高さ
 * @param buf 出力先
 */
function fractal(n: int, h: float, height: float, buf: float[,]) {
	var time = System.DateTime.Now;
	var ar: float[,] = new float[n, n];
	var ai: float[,] = new float[n, n];
	var x: int;
	var y: int;

	// ガウス乱数生成。
	gauss(ar, ai, n, h);

	// 2次元高速フーリエ変換。
	fft2(ar, ai, n, 1);

	// output
	var max: float = -Mathf.Infinity;
	var min: float = Mathf.Infinity;
	for (x = 0; x < n; ++ x) {
		for (y = 0; y < n; ++ y) {
			min = Mathf.Min(min, ar[x, y]);
			max = Mathf.Max(max, ar[x, y]);
		}
	}
	//int/*C** /*J*/[]/**/ buf = new int[n * n];
	for (x = 0; x < n; ++ x) {
		for (y = 0; y < n; ++ y) {
			buf[x, y] = (ar[x, y] - min) * height / (max - min);
		}
	}
	Debug.Log("> max = " + max + ", min = " + min + ", time = " + (System.DateTime.Now - time));
	return buf;
}

/**
 * ガウス乱数生成。
 * 
 * @param ar 出力先実数部
 * @param ai 出力先虚数部
 * @param n 要素数
 * @param h フラクショナルブラウン運動(fBm)のハースト定数
 */
function gauss(ar: float[,], ai: float[,], n: int, h: float) {
	var n_rand: int = 4;
	var a_rand: int = 1;//RAND_MAX;//1.0;
	var gauss_add: float = Mathf.Sqrt(3.0f * n_rand);
	var gauss_fac: float = 2 * gauss_add / (n_rand * a_rand);
	var x: int;
	var y: int;
	var phase: float;
	var rad: float;
	var wr: float;
	var wi: float;
	for (x = 0; x <= n / 2; ++ x) {
		for (y = 0; y <= n / 2; ++ y) {
			phase = 2 * Mathf.PI * Random.value / a_rand;
			rad = ((x >= 1) && (y >= 1))
				? Mathf.Pow((x * x) + (y * y), -(h + 1) / 2) * gauss1(n_rand, gauss_add, gauss_fac)
				: 0;
			wr = rad * Mathf.Cos(phase);
			wi = rad * Mathf.Sin(phase);
			if ((x <= elem_cnt) && (y <= elem_cnt)) {
				ar[x, y] = wr;
				ai[x, y] = wi;
//chkbuf*/ar[x, y] = 1;
				var x2: int = (x >= 1) ? n - x : 0;
				var y2: int = (y >= 1) ? n - y : 0;
				ar[x2, y2] = wr;
				ai[x2, y2] = -wi;
//chkbuf*/ar[x2, y2] = 1;
			}
		}
	}
	for (x = 1; x < n / 2; ++ x) {
		for (y = 1; y < n / 2; ++ y) {
			phase = 2 * Mathf.PI * Random.value / a_rand;
			rad = Mathf.Pow((x * x) + (y * y), -(h + 1) / 2) * gauss1(n_rand, gauss_add, gauss_fac);
			wr = rad * Mathf.Cos(phase);
			wi = rad * Mathf.Sin(phase);
			if ((x < elem_cnt) && (y < elem_cnt)) {
				ar[x, n - y] = wr;
				ai[x, n - y] = wi;
//chkbuf*/ar[x + (n - y)] = 1;
				ar[n - x, y] = wr;
				ai[n - x, y] = -wi;
//chkbuf*/ar[(n - x) + y] = 1;
			}
		}
	}
//chkbuf*/for (x = 0; x < n * n; ++ x)
//chkbuf*/{
//chkbuf*/	if (0 == ar[x % n, x / n])
//chkbuf*/	{
//chkbuf*/		Log.out(String("") + (x % n) + "," + (x / n));
//chkbuf*/	}
//chkbuf*/}
}

/**
 * ガウス乱数生成。
 * 
 * @param n_rand 乱数個数
 * @param gauss_add 乱数乗数
 * @param gauss_fac 乱数減算数
 */
function gauss1(n_rand: int, gauss_add: float, gauss_fac: float) {
	var sum: float = 0;
	for (var i: int = 0; i < n_rand; ++ i) {
		sum += Random.value;
	}
	return gauss_fac * sum - gauss_add;
}

/**
 * 1次元高速フーリエ変換。
 * 
 * @param ar 入出力実数部
 * @param ai 入出力虚数部
 * @param n 要素数
 * @param n 要素数の2のべき乗数
 * @param sign -1: フーリエ変換, 1: フーリエ逆変換
 */
function fft1(ar: float[], ai: float[], n: int, nb: int, sign: int) {
	var i: int;
	var j: int;
	var k: int;
	for (var xp: int = n; xp >= 2; xp /= 2) {
		for (i = 0; i < xp / 2; ++ i) {
			var wr: float = Mathf.Cos(i * Mathf.PI / (xp / 2));
			var wi: float = Mathf.Sin(i * Mathf.PI / (xp / 2)) * sign;
			for (j = xp; j <= n; j += xp) {
				var j1: int = j + (i - xp);
				var j2: int = j1 + (xp / 2);
				var dr1: float = ar[j1];
				var dr2: float = ar[j2];
				var di1: float = ai[j1];
				var di2: float = ai[j2];
				ar[j1] = dr1 + dr2;
				ai[j1] = di1 + di2;
				ar[j2] = (dr1 - dr2) * wr - (di1 - di2) * wi;
				ai[j2] = (di1 - di2) * wr + (dr1 - dr2) * wi;
			}
		}
	}
	for (i = j = 0; i < n - 1; ++ i) {
		if (i < j) {
			var tr: float = ar[j];
			var ti: float = ai[j];
			ar[j] = ar[i];
			ai[j] = ai[i];
			ar[i] = tr;
			ai[i] = ti;
		}
		for (k = n >> 1; k <= j; ) {
			j -= k;
			k >>= 1;
		}
		j += k;
	}
	if (1 == sign) {
		for(i = 0; i < n; ++ i) {
			ar[i] /= n;
			ai[i] /= n;
		}
	}
}

/**
 * 2次元高速フーリエ変換。
 * 
 * @param ar 入出力実数部
 * @param ai 入出力虚数部
 * @param n 要素数
 * @param sign -1: フーリエ変換, 1: フーリエ逆変換
 */
function fft2(ar: float[,], ai: float[,], n: int, sign: int) {
	var nb: int = Mathf.Log(n) / Mathf.Log(2.0f); // n = log2(m)
	var wr: float[] = new float[n];
	var wi: float[] = new float[n];
	var x: int = 0;
	var y: int = 0;
	//chkbuf*/for (x = 0; x < n; ++ x)
	//chkbuf*/{
	//chkbuf*/	wr[x] = 0;
	//chkbuf*/	wi[x] = 0;
	//chkbuf*/}
	for (y = 0; y < n; ++ y) {
		for (x = 0; x < n; ++ x) {
			wr[x] = ar[x, y];
			wi[x] = ai[x, y];
		}
		fft1(wr, wi, n, nb, sign);
		for (x = 0; x < n; ++ x) {
			ar[x, y] = wr[x];
			ai[x, y] = wi[x];
		}
	}
	//chkbuf*/for (x = 0; x < n; ++ x)
	//chkbuf*/{
	//chkbuf*/	wr[x] = 0;
	//chkbuf*/	wi[x] = 0;
	//chkbuf*/}
	for (x = 0; x < n; ++ x) {
		for (y = 0; y < n; ++ y) {
			wr[y] = ar[x, y];
			wi[y] = ai[x, y];
		}
		fft1(wr, wi, n, nb, sign);
		for (y = 0; y < n; ++ y) {
			ar[x, y] = wr[y];
			ai[x, y] = wi[y];
		}
	}
}

function OnCollisionEnter(collision: Collision) {
	MainScript.Log("terrain collision", "terrain collision: " + collision.gameObject.name + "," + collision.contacts[0].point);
	if ("ball(Clone)" == collision.gameObject.name) {
		Destroy(collision.gameObject);
		// 破壊エフェクト。
		var particle: GameObject = Instantiate(particlePrefab, collision.transform.position - Vector3(0, 5, 0), Quaternion.identity); // インスタンスの生成
		particle.tag = "Respawn";
		Destroy(particle, 3);
		// 穴を掘る
		var terrain: Terrain = gameObject.GetComponent(Terrain);
		var R: int = 5; // 穴の半径
		var D: float = 0.002; // 穴の深さ
		var w: int = terrain.terrainData.heightmapWidth;
		var h: int = terrain.terrainData.heightmapHeight;
		var mapX: int = collision.contacts[0].point.z * w / terrain.terrainData.size.x; // heightmap 上の座標
		var mapZ: int = collision.contacts[0].point.x * h / terrain.terrainData.size.z; // heightmap 上の座標
		var mapR: int = R * w / terrain.terrainData.size.z; // heightmap 上の座標
		// z -> x
		var z1: int = Mathf.Max(-mapR, -mapZ);
		var z2: int = Mathf.Min(mapR, -mapZ + h - 1);
		for (var z: int = z1; z <= z2; ++ z) {
			// x -> y
			var mapW: int = Mathf.Sqrt(mapR * mapR - z * z);
			var x1: int = Mathf.Max(-mapW, -mapX);
			var x2: int = Mathf.Min(mapW, -mapX + w - 1);
			for (var x: int = x1; x <= x2; ++ x) {
				heights[x + mapX, z + mapZ] = Mathf.Max(0, heights[x + mapX, z + mapZ] - D * Mathf.Sqrt(mapW * mapW - x * x));
			}
		}
		terrain.terrainData.SetHeights(0, 0, heights);
		// ヒット。
		for (var cannon: GameObject in [player, other]) {
			if ((cannon.transform.position - collision.transform.position).magnitude
					< cannon.transform.FindChild("Sphere").transform.localScale.x / 2 + R) {
				cannon.GetComponent(cannonScript).Hit();
			}
		}
	}
}

function OnApplicationQuit() {
	print("quit");
	// アプリケーション終了時に高さマップを復帰
	var terrain: Terrain = gameObject.GetComponent(Terrain);
	terrain.terrainData.SetHeights(0, 0, heightsOrg); // 変更前の高さマップ
}
