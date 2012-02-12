/**
 * PNG alpha polyfill for old IE based on IE PNG Fix
 * with heavy modifications.
 *
 * @link  http://www.twinhelix.com/css/iepngfix/
 */

(function() {

	window.IEPNGFix = IEPNGFix || {};
	IEPNGFix.data = IEPNGFix.data || {};


	// CONFIG: blankImg is the path to blank.gif, *relative to the HTML document*.
	IEPNGFix.blankImg = Polyfill.resourceUrl('blank.gif');


	IEPNGFix.fix = function(elm, src, t) {
		// Applies an image 'src' to an element 'elm' using the DirectX filter.
		// If 'src' is null, filter is disabled.
		// Disables the 'hook' to prevent infinite recursion on setting BG/src.
		// 't' = type, where background tile = 0, background = 1, IMG SRC = 2.

		var h = this.hook.enabled;
		this.hook.enabled = 0;

		var f = 'DXImageTransform.Microsoft.AlphaImageLoader';
			src = (src || '').replace(/\(/g, '%28').replace(/\)/g, '%29');

		if (
			src && !(/IMG|INPUT/.test(elm.nodeName) && (t != 2)) &&
			elm.currentStyle.width == 'auto' && elm.currentStyle.height == 'auto'
		) {
			if (elm.offsetWidth) {
				elm.style.width = elm.offsetWidth + 'px';
			}
			if (elm.clientHeight) {
				elm.style.height = elm.clientHeight + 'px';
			}
			if (elm.currentStyle.display == 'inline') {
				elm.style.display = 'inline-block';
			}
		}

		if (t == 1) {
			elm.style.backgroundImage = 'url("' + this.blankImg + '")';
		}
		if (t == 2) {
			elm.src = this.blankImg;
		}

		if (elm.filters[f]) {
			elm.filters[f].enabled = src ? true : false;
			if (src) {
				elm.filters[f].src = src;
			}
		} else if (src) {
			elm.style.filter = 'progid:' + f + '(src="' + src +
				'",sizingMethod="' + (t == 2 ? 'scale' : 'crop') + '")';
		}

		this.hook.enabled = h;
	};


	IEPNGFix.process = function(elm, init) {
		// Checks the onpropertychange event (on first 'init' run, a fake event)
		// and calls the filter-applying-functions.

		if (
			!/MSIE (5\.5|6)/.test(navigator.userAgent) ||
			typeof elm.filters == 'unknown'
		) {
			return;
		}
		if (!this.data[elm.uniqueID]) {
			this.data[elm.uniqueID] = {
				className: ''
			};
		}
		var data = this.data[elm.uniqueID],
			evt = init ? { propertyName: 'src,backgroundImage' } : event,
			isSrc = /src/.test(evt.propertyName),
			isBg = /backgroundImage/.test(evt.propertyName),
			isPos = /width|height|background(Pos|Rep)/.test(evt.propertyName),
			isClass = !init && ((elm.className != data.className) &&
				(elm.className || data.className));
		if (!(isSrc || isBg || isPos || isClass)) {
			return;
		}
		data.className = elm.className;
		var blank = this.blankImg.match(/([^\/]+)$/)[1],
			eS = elm.style,
			eCS = elm.currentStyle;

		// Required for Whatever:hover - erase set BG if className changes.
		if (
			isClass && (eS.backgroundImage.indexOf('url(') == -1 ||
			eS.backgroundImage.indexOf(blank) > -1)
		) {
			return setTimeout(function() {
				eS.backgroundImage = '';
			}, 0);
		}

		// Foregrounds.
		if (isSrc && elm.src && { IMG: 1, INPUT: 1 }[elm.nodeName]) {
			if ((/\.png/i).test(elm.src)) {
				if (!elm.oSrc) {
					// MM rollover compat
					elm.oSrc = elm.src;
				}
				this.fix(elm, elm.src, 2);
			} else if (elm.src.indexOf(blank) == -1) {
				this.fix(elm, '');
			}
		}

		// Backgrounds.
		var bgSrc = eCS.backgroundImage || eS.backgroundImage;
		if ((bgSrc + elm.src).indexOf(blank) == -1) {
			var bgPNG = bgSrc.match(/url[("']+(.*\.png[^\)"']*)[\)"']/i);
			if (bgPNG) {
				if (this.tileBG && !{ IMG: 1, INPUT: 1 }[elm.nodeName]) {
					this.tileBG(elm, bgPNG[1]);
					this.fix(elm, '', 1);
				} else {
					if (data.tiles && data.tiles.src) {
						this.tileBG(elm, '');
					}
					this.fix(elm, bgPNG[1], 1);
					this.childFix(elm);
				}
			} else {
				if (data.tiles && data.tiles.src) {
					this.tileBG(elm, '');
				}
				this.fix(elm, '');
			}
		} else if ((isPos || isClass) && data.tiles && data.tiles.src) {
			this.tileBG(elm, data.tiles.src);
		}

		if (init) {
			this.hook.enabled = 1;
			elm.attachEvent('onpropertychange', this.hook);
		}
	};


	IEPNGFix.childFix = function(elm) {
		// "hasLayout" fix for unclickable children inside PNG backgrounds.
		var tags = [
				'a',
				'input',
				'select',
				'textarea',
				'button',
				'iframe',
				'object'
			],
			t = tags.length,
			tFix = [];
		while (t--) {
			var pFix = elm.all.tags(tags[t]),
				e = pFix.length;
			while (e--) {
				tFix.push(pFix[e]);
			}
		}
		t = tFix.length;
		if (t && (/relative|absolute/i).test(elm.currentStyle.position)) {
			alert('IEPNGFix: Unclickable children of element:' +
				'\n\n<' + elm.nodeName + (elm.id && ' id=' + elm.id) + '>');
		}
		while (t--) {
			if (!(/relative|absolute/i).test(tFix[t].currentStyle.position)) {
				tFix[t].style.position = 'relative';
			}
		}
	};


	IEPNGFix.hook = function() {
		if (IEPNGFix.hook.enabled) {
			IEPNGFix.process(element, 0);
		}
	};
	
// ------------------------------------------------------------------
//  Load the behavior
	
	if (! document.styleSheets.length) {
		var root = document.getElementsByTagName('head')[0] || document.documentElement;
		root.insertBefore(
			document.createElement('style'), root.lastChild
		);
	}
	
	document.styleSheets[0].addRule('*',
		'behavior:expression(IEPNGFix.process(this, 1)'
	);
	
}());

/* End of file pngalpha.js */
