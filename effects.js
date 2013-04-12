/* 
 * 用来匹配数字的正则，可匹配可选正负号，浮点型，整型，科学计数法
 * 没有使用?来表示可选而是通过|来选择
 * (?:\d*\.|)匹配浮点数时，|前的\d*\.可以匹配整数部分和小数点，小数部分由后面的\d+匹配
 * 匹配整数时，|)可以保证匹配继续向下进行，整数由后面的\d+匹配，同样的\d+在匹配整型和浮点型时负责的匹配部分不同
 * [eE][\-+]?\d+|)处理科学计数法的匹配，同样没有使用?表示可选
 * .source在正则表达式拼接时，会移掉正则的开始结束标志
 */
// core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source
var fxNow, 
	timerId,	// 定时器
	rfxtypes = /^(?:toggle|show|hide)$/,	
	rfxnum = new RegExp( "^(?:([-+])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],		// 动画过滤器
	tweeners = {	// 缓动对象，控制补间、缓动函数、时间等
		// Exclude the following css properties to add px
		// 不需要添加px单位的css属性
		// cssNumber: {
		// 	"fillOpacity": true,
		// 	"fontWeight": true,
		// 	"lineHeight": true,
		// 	"opacity": true,
		// 	"orphans": true,
		// 	"widows": true,
		// 	"zIndex": true,
		// 	"zoom": true
		// }
		// 计算开始、结束的值、单位
		// 只支持数字类型
		"*": [function( prop, value ) {
			var end, unit,
				tween = this.createTween( prop, value ),
				parts = rfxnum.exec( value ),	// 动画变化的数字数组 ["+=100px", "+", "100", "px", index: 0, input: "+=100px"]
				target = tween.cur(),			// 获取属性的当前值
				start = +target || 0,			// 修正开始的位置，转换为数字，如果转换失败设为0
				scale = 1,						// 比例
				maxIterations = 20;				// 最大迭代次数

			if ( parts ) {	
				end = +parts[2];	// 结束位置
				unit = parts[3] || ( jQuery.cssNumber[ prop ] ? "" : "px" );	// 修正单位

				// We need to compute starting value
				// 修正开始的位置,unit可能为%、em
				// 当单位不是px时，需要修正一下开始的属性值，因为我们上面用的都是根据px计算出的属性值
				if ( unit !== "px" && start ) {
					// Iteratively approximate from a nonzero starting point
					// Prefer the current property, because this process will be trivial if it uses the same units
					// Fallback to end or a simple constant
					// 获取css属性的值，如果为0则回退到结束值或1
					start = jQuery.css( tween.elem, prop, true ) || end || 1;

					// 循环改变style值
					do {
						// If previous iteration zeroed out, double until we get *something*
						// 如果之前的迭代归零，加倍直到得到东西
						// Use a string for doubling factor so we don't accidentally see scale as unchanged below
						// 使用字符串作为加倍因子，这样就不会出现比例是一个不变的值？
						// 这里直接使用0.5会怎么样？
						scale = scale || ".5";

						// Adjust and apply
						// 校正和应用
						start = start / scale;
						// 改变css样式，动画
						jQuery.style( tween.elem, prop, start + unit );

					// Update scale, tolerating zero or NaN from tween.cur()
					// 更新比例，容忍从tween.cur()获得0或NaN
					// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
					// scale不变或完成或循环最大次数时，结束循环
					} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
				}

				tween.unit = unit;
				tween.start = start;
				// If a +=/-= token was provided, we're doing a relative animation
				// 如果存在+/-,则相对动画，计算结束位置
				tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
			}
			return tween;
		}]
	};

// Animations created synchronously will run synchronously
// 同步动画同步运行
function createFxNow() {
	// 延误js的执行，让页面渲染线程跟上,类似script defer效果
	setTimeout(function() {
		fxNow = undefined;
	}, 0 );
	return ( fxNow = jQuery.now() );
}

// 创建缓动
function createTweens( animation, props ) {
	// 遍历所有的属性，获取动画信息
	jQuery.each( props, function( prop, value ) {
		var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( collection[ index ].call( animation, prop, value ) ) {

				// we're done with this property
				return;
			}
		}
	});
}

/** 动画构造函数
 * @param elem 		 {} jQuery对象
 * @param properties {Object} css属性
 * @param options 	 {Object} 经过speed修正后的对象，包括duration，easing...
 */
function Animation( elem, properties, options ) {
	var result,
		index = 0,
		tweenerIndex = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {	// 定义deferred对象
			// 不管延迟成功还是失败，都会执行
			// don't match elem in the :animated selector
			// 不匹配正在执行动画效果的元素
			delete tick.elem;
		}),
		// 动画的帧
		tick = function() {
			var currentTime = fxNow || createFxNow(),	// 当前时间
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),	// 剩余时间
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,		// 剩余的百分比
				percent = 1 - temp,		// 完成百分比
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				// 设置动画当前的css属性
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				// 返回剩余时间，算出属性的当前值
				// 给后面的全局timers执行剩余的动画
				return remaining;
			} else {
				// 动画结束，执行回调函数
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		// 返回一个promise对象.并把一些属性绑定到这个对象上,方便deferred对象访问
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,	// 保存原始属性值
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],		// 动画数组
			// 创建补间动画,保存到动画数组中
			createTween: function( prop, end, easing ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			// 属性动画停止的时候执行
			// 可能是执行完停止，动画成功，调用complete回调
			// 也有可能是被动停止(stop()),这时候动画被迫停止，调用fail回调
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					// 是立即将所有的动画转换为结束状态还是跳过
					length = gotoEnd ? animation.tweens.length : 0;

				// 循环每个动画，让元素立即转换到结束状态
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				// 结束Deferred
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	// 修正属性
	propFilter( props, animation.opts.specialEasing );

	// 动画过滤、校正
	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	// 遍历所有的属性，创建补间动画
	createTweens( animation, props );

	// 执行start回调
	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}
	
	// 定时器？
	jQuery.fx.timer(
		jQuery.extend( tick, {
			anim: animation,
			queue: animation.opts.queue,
			elem: elem
		})
	);

	// attach callbacks from options
	// 执行附加在options中的回调函数
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

// 修正属性
// 如果是数组，保存到easing中，如width: [100, 'swing']
// 修改成驼峰命名
// 转换css组合属性
function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	// 遍历动画属性
	for ( index in props ) {
		name = jQuery.camelCase( index );	// 属性名转换为驼峰命名
		easing = specialEasing[ name ];
		value = props[ index ];
		// 如果是数组，那第一个值为属性值，第二个值为easing的值
		// 为单个css属性设置动画效果
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		// 把一些本该驼峰命名但没有的动画属性修正为驼峰命名的
		// 平时要尽量使用驼峰命名，避免转换的成本
		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		// margin、padding、border、height、width、opacity、top、left
		hooks = jQuery.cssHooks[ name ];
		// 转换css组合属性 margin、padding、borderWidth，以后可能会加上其他的css3属性
		if ( hooks && "expand" in hooks ) {
			// 返回上下左右扩张的对象,如{ marginTop: '', marginRight: '', marginBottom: '', marginLeft: '' }
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			// $.extend会重写对象，所以这里使用循环，保证不重写已有对象
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

// 扩展Animation类
jQuery.Animation = jQuery.extend( Animation, {
	// 添加的动画对象控制方法
	// 没有那个地方用到,扩展用的
	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	// 添加动画过滤器
	// 也是扩展用的
	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

// 前置过滤
// 动画前缓存状态，方便动画结束后恢复
// show/hide/toggle走默认的动画
// @param elem 	{} jQuery对象
// @param props {Object} css属性
// @param opts 	{Object} 经过speed修正后的对象，包括duration，easing...
function defaultPrefilter( elem, props, opts ) {
	var index, prop, value, length, dataShow, toggle, tween, hooks, oldfire,
		anim = this,	// 动画本身
		style = elem.style,
		orig = {},	// 保存属性的原始值,动画回退的时候使用
		handled = [],
		hidden = elem.nodeType && isHidden( elem );		// 判断节点的可见性

	// handle queue: false promises
	// queue=false，不插入队列，单独执行这次动画 
	if ( !opts.queue ) {
		// 将队列钩子关联到对象上或返回当前element，data上绑了个empty方法，可以将data清除
		hooks = jQuery._queueHooks( elem, "fx" );

		// 当所有的非队列的动画执行完毕后清除data
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;		// 缓存旧的调用方法
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		// 这里为什么要写两层呢？
		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			// 确保完整的处理在这之前调用。清空data
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	// 改变元素的宽高，先让行内元素具有完整盒模型
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		// 记住节点的overflow
		// 记录所有的3个溢出属性，因为当x/y设置为相同值时，ie会不改变overflow
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		// 内联元素的宽高动画，先将其display属性设置为inline-block，具有盒模型
		if ( jQuery.css( elem, "display" ) === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			// ie67触发hasLayout，其他设置为inline-block
			if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	// 动画改变元素大小时, overflow设置为hidden, 避免滚动条也跟着不停改变  
	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !jQuery.support.shrinkWrapBlocks ) {	// 非ie6
			// 动画执行完成后恢复元素的overflow属性
			anim.done(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	// rfxtypes = /^(?:toggle|show|hide)$/
	// toggle|show|hide 调用默认动画形式
	for ( index in props ) {
		value = props[ index ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ index ];
			toggle = toggle || value === "toggle";
			// 元素在不可见状态隐藏或者可见状态显示，不做任何操作
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			handled.push( index );
		}
	}

	length = handled.length;
	// toggle
	if ( length ) {
		dataShow = jQuery._data( elem, "fxshow" ) || jQuery._data( elem, "fxshow", {} );
		// 缓存toggle的show|hide
		if ( "hidden" in dataShow ) {
			hidden = dataShow.hidden;
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		// 缓存toggle的状态
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}

		// 如果是展示，先展示，再执行动画；如果是隐藏，动画结束再隐藏
		// 调用内部的showHide方法
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		// hide,show操作完成后,恢复属性值. 通过hide/show动画开始前记录的原始属性值.
		anim.done(function() {
			var prop;
			jQuery.removeData( elem, "fxshow", true );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( index = 0 ; index < length ; index++ ) {
			prop = handled[ index ];
			// 创建动画
			// dataShow[ prop ]这里还未设置，动画结束后又立马清掉，保存主要是给动画stop的时候用的？
			tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
			// hide/show动画开始前记录原始属性值，动画结束恢复用
			orig[ prop ] = dataShow[ prop ] || jQuery.style( elem, prop );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					// 把width和height设置为一个很小的值, 防止屏幕闪烁.  
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

/**
 * 补间动画类
 * 读取、计算、设置css属性值
 * @param {DOM}    elem    [description]
 * @param {Object} options 经过speed修正后的对象，包括duration，easing..
 * @param {String} prop    css属性
 * @param {Number} end     css属性值
 * @param {String} easing  动画算法swing...
 */
function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	/* @param {DOM}    elem    [description]
	 * @param {Object} options 经过speed修正后的对象，包括duration，easing..
	 * @param {String} prop    css属性
	 * @param {Number} end     css属性值
	 * @param {String} easing  动画算法swing...
	 * @param {Number} unit    单位，现在只支持px
	 */
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	// 读取css属性值
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	// 计算、设置css属性的当前值
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			// 通过动画算法计算属性当前值(百分比)
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		// 计算属性当前值
		this.now = ( this.end - this.start ) * eased + this.start;

		// 每一帧动画结束后,都会执行回调函数
		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		// 读取css属性值
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing any value as a 4th parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			// 给.css()传入任意的第四个参数值，将自动转换类型为float型,如果转换失败的话将原样返回.
			result = jQuery.css( tween.elem, tween.prop, false, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			// 空字符串，null，undefined和auto转换为0
			// (!result || result === "auto") ? 0 : result
			return !result || result === "auto" ? 0 : result;
		},
		// 设置css属性值为动画的当前值
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			// cssProps主要是过滤css属性（比如加上浏览器css前缀）
			if ( jQuery.fx.step[ tween.prop ] ) { // 以前的版本使用jQuery.fx.step
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				// 如果支持style
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				// 否则使用属性
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes
// 将在2.0中移除，支持解决ie8在不连续的节点设置属性问题

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

// shortcut API
jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		// 不传参数，或者typeof speed === "boolean"时
		// 直接调用内部的showhide|eventsToggle方法，相当于直接设置css属性，唯一不同的是show时，display的值是元素的默认值
		// 如果是toggle方法，并且speed和easing都是function时，直接调用eventsToggle
		// 否则调用动画
		return  speed == null || typeof speed === "boolean" ||
			// special check for .toggle( handler, handler, ... )
			( !i && jQuery.isFunction( speed ) && jQuery.isFunction( easing ) ) ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		// 如果是隐藏的节点,先设置透明度为0
		// 然后再动画到指定的透明度
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	/*API
	 * prop css属性，show、hide方法里，是由genFx函数转化而来
	 * @param {Object} prop css属性
	 * @param {Number|String} 
	 * @param {easing} 缓动函数.默认swing
	 * @param {Function} 动画完成时的回调函数
	 */
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),	// 动画是否有属性变化
			optall = jQuery.speed( speed, easing, callback ),	// 得到一个包含speed、easing、修正后callback的对象
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations resolve immediately
				// 动画属性是空对象，直接执行回调函数
				if ( empty ) {
					anim.stop( true );
				}
			};

		// 如果动画属性为空，直接执行回调函数
		// 如果opt.queue===false,不插入动画队列,单独执行这次动画
		// 否则插入队列
		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	/**
	 * 停止匹配元素当前正在运行的动画.默认情况下正在执行的动画立即停止(可能正执行的动画只执行了一半)
	 * @type 		{String} 	停止动画的名称
	 * @clearQueue	{Boolean}	指示是否取消列队动画。默认 false. true时,重新开始时被取消的当前动画重新执行
	 * @gotoEnd 	{Boolean}	指示是否当前动画立即完成。默认false. true时,当前css属性立即修改成动画的结束状态
	 **/
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		// clearQueue===true,清空队列
		// 这里只是清空队列，当前动画是否执行完是Animation的stop判断的
		// type不可能是false，这个判断有必要吗？
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",	// queue=false时生成的队列钩子
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) { // queue=false的逻辑
				// stop是什么时候绑上去的？
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd ); 	// 调用Animation的stop方法
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			// gotoEnd的时候已经会调用下一个dequeue了
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	}
});

// Generate parameters to create a standard animation
// 生成参数创建标准动画
// 主要用于快捷方法
// 默认情况下只做垂直方向的变化，show、hide四面都变化
// attrs = { height: type, marginTop: type, marginBottom: type, paddingTop: type, paddingBottom: type,
// [marginLeft: type, marginRight: type, paddingLeft: type, paddingRight: type, opacity: type, width: type] }
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },	// 一般动画都是通过高度的改变完成的
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	// cssExpand = [ "Top", "Right", "Bottom", "Left" ]
	// 如果包含width，上下左右都调整，否则跳过左右
	// 显示和隐藏的时候，注意要把margin、padding设为0或者恢复
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	// show/hide时透明度和宽度也要变化
	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
// 自定义动画的快捷方式,这些快捷方式最终还是调用animate
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

// 静态方法, 帮助animate修正参数, 并且重写回调函数.重写回调函数调用队列中的下一个动画
// 参数最终修正成第二种调用方式 .animate( properties, options )
jQuery.speed = function( speed, easing, fn ) {
	// 如果本身就是第二种调用方式，就复制一份；
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// 如果jQuery.fx.off为true,禁止执行动画,类似于css,duration设为0
	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	// 修正opt.queue的值为fx，如果是字符串，则生成一个自定义队列
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	// 缓存老的回调函数
	opt.old = opt.complete;

	// 重写回调函数,把dequeue操作加入回调函数,方便调用下一个动画
	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.easing = {
	// 匀速运动
	linear: function( p ) {
		return p;
	},
	// 余弦
	// 动画效果慢/快/慢
	// 0~π,缓/陡/缓
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

jQuery.timers = []; 	// 动画对象数组，保存所有当前在执行动画的函数.
jQuery.fx = Tween.prototype.init;	// 动画构造函数

// 静态方法, 定时器方法, 监控所有动画的执行情况
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,		// 新的jQuery里定义了局部变量，提高性能
		i = 0;

	fxNow = jQuery.now();	// 当前时间

	// timers里面包括所有当前所有在执行动画的函数.  
	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// timer就是Animation里的tick，
		// 动画如果完成，tick会返回false，在全局的timers中删除掉它
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	// 如果timers没有元素，即动画已全部执行完，则清空定时器
	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;	 // 清除时间
};

// 全局的定时器,setInterval调度动画的每一帧
// 保证只有一个全局定时器
jQuery.fx.timer = function( timer ) {
	// 先执行动画的第一帧
	// 如果为false,代表动画结束;否则返回remain,把动画保存到全局的timers中,以便定时器里循环执行
	if ( timer() && jQuery.timers.push( timer ) && !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.interval = 13;

// 清除定时器
jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
// 1.8以前版本的对象。用于执行每一步动画
// 现在已经放在Animation对象的tick方法里了
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
