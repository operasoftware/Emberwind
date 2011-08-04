var perlin = {start:true, g1 : [], p : []};

perlin.noise1 = function (arg){
	var bx0, bx1;
	var rx0, rx1, sx, t, u, v;

	if (this.start) {
		this.start = false;
		this.init();
	}

	var s = this.setup(arg,bx0,bx1,rx0,rx1);

	sx = this.s_curve(s.rx0);
	u = s.rx0 * this.g1[ this.p[ s.bx0 ] ];
	v = s.rx1 * this.g1[ this.p[ s.bx1 ] ];

	return lerp(u, v, sx);
};

perlin.s_curve = function (t){
	return t * t * (3 - 2 * t);
};

perlin.setup = function (i,bx0,bx1,rx0,rx1){
	var B = 0x100;
	var BM = 0xff;
	var N = 0x1000;
	var NP = 12;
	var NM = 0xfff;

	var s = {};
	s.t = i + N;
	s.bx0 = Math.floor(s.t) & BM;
	s.bx1 = (s.bx0+1) & BM;
	s.rx0 = s.t - Math.floor(s.t);
	s.rx1 = s.rx0 - 1;
	return s;
};

perlin.at2 = function (rx,ry){
	return rx * q[0] + ry * q[1];
};

perlin.at3 = function (rx,ry,rz){
	return rx * q[0] + ry * q[1] + rz * q[2];
};

perlin.init = function(){
	var B = 0x100;
	var i, j, k;

	for (i = 0 ; i < B ; i++) {
		this.p[i] = i;
		this.g1[i] = (Math.random() * (B + B) - B) / B;

		/*for (j = 0 ; j < 2 ; j++)
			g2[i][j] = (double)((rand() % (B + B)) - B) / B;
		normalize2(g2[i]);*/

		/*for (j = 0 ; j < 3 ; j++)
			g3[i][j] = (double)((rand() % (B + B)) - B) / B;
		normalize3(g3[i]);*/
	}

	while (--i) {
		k = this.p[i];
		j = Math.floor(Math.random() * B);
		this.p[i] = this.p[j];
		this.p[j] = k;
	}

	for (i = 0 ; i < B + 2 ; i++) {
		this.p[B + i] = this.p[i];
		this.g1[B + i] = this.g1[i];
		/*for (j = 0 ; j < 2 ; j++)
			g2[B + i][j] = g2[i][j];
		for (j = 0 ; j < 3 ; j++)
			g3[B + i][j] = g3[i][j];*/
	}
};