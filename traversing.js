var runtil = /Until$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	isSimple = /^.[^:#\[\.,]*$/,
	rneedsContext = jQuery.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

/* 为 jQuery 实例对象提供扩展方法，用于对结果集的辅助操作，比如条件判断、过滤等，
 * 严格来说不属于遍历范畴（我认为），所以jQuery把它们放在了 Miscellaneous Traversing 下
 * find, has, not, filter, is, closest, index, add, addBack
 */
jQuery.fn.extend({
	find: function( selector ) {
		var i, l, length, n, r, ret,
			self = this;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		ret = this.pushStack( "", "find", selector );

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},
    /**
     * @desc http://api.jquery.com/is/ 涉及Sizzle，不在此次分析范畴
     */
	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				rneedsContext.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			ret = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			cur = this[i];

			while ( cur && cur.ownerDocument && cur !== context && cur.nodeType !== 11 ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;
				}
				cur = cur.parentNode;
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},
    /**
     * @desc 向当前结果元素集中添加一些元素
     * @param selector 一个用于查找匹配另外的元素的选择器
     * @param context 文档中查找匹配的起始点
     */
	add: function( selector, context ) {
        /*
        set
        1.如果是字符串，则使用jQuery(selector, cxt)，则生成一个jq对象，它可能包含0个或多个元素。
        其中的元素可能是页面上已有的（selector是选择器），可能是docfragment（selector是html片段）
        2.如果不是字符串：则得到一个包含0个或多个元素的array。
        all
        将当前jQuery对象包含的元素和set合并后的新array
         */
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );
        /*
         isDisconnected( set[0] ) 为 true 表示 selector 是一个html片段，
         isDisconnected( all[0] ) 为 true 表示 当前 jQuery 对象包含的是一个 docfragment，
         这两种情况都不存在去重的需要。
         */
		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},
    /* 如果 selector 为空，则将上一次结果元素集 push 到jQuery栈的最上面，
     * 如果存在 selector ，则还要另加一次过滤
     * 这里有一个很有趣的属性 —— prevObject ，它指向上一次结果jQuery 对象
     */
	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

// andSelf 方法名以后将 addBack 替换，所以请使用 addBack，
// 这两个方法在官方 API 文档里的区别是：前者不接受参数，后者可选接受一个查找参数
jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
// 检查某个节点是否在 document 中
// DOCUMENT_FRAGMENT_NODE(11)
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}
/**
 * @desc 查找某个元素的兄元素或弟元素
 * @param cur {Element} 出发点元素
 * @param dir {string } 方向 'previousSibling' or 'nextSibling'
 * @return {Element}
 */
function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 ); // ELEMENT_NODE(1)

	return cur;
}
// 由于要定义方法的参数列表几乎一样，这里使用了一个小技巧，简洁地批定义一堆方法
jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) { // i 是做什么的呢？
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
        /* this 是调用该 name 方法的 jQuery 对象，
         * $.map 的官方文档里指明接受两个参数，但这里我们看到其实传了三个参数
         * 其实第三个参数会以回调函数 fn 的第三个参数的形式传入，其实就是这样：
         * $.map(arrayOrObject, function (value, indexOrKey, until) { ... }, until)
         * value是一个HTML原生节点元素， until只有三个以Until结尾的方法用得到（jQuery接口乱啊）
         * ret 是一个数组{Array}，它包含了所有满足条件的元素
         */
        var ret = jQuery.map( this, fn, until );

        // 后面会根据条件过滤掉一些

		/*
         * 实去除以下三个方法，他们拥有相同的参数列表：
         * 上面通过 $.each() 批量添加的方法中，有三个方法具有相同的参数列表，这三个方法是：
         * parentsUntil、 prevUntil、 nextUntil，他们的参数列表形如：( elem, i, until )
         * 若方法名不是以 Until 结尾， 则只接受一个参数，形如：( selector )
         * 这时的第一个参数 until 就相当于 selector 值，所以这个判断做了一个赋值处理
         * Suck jQuery
         */
        if ( !runtil.test( name ) ) {
            selector = until;
        }

		// 如果存在合法的 selector，则从所有结果集中将满足该 selector 的元素过滤出来
        if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		/* 参考模块开头处，!guaranteedUnique[ name ] 为 true 的可能性只有name为以下值时：
         * parent, parents, parentsUntil, nextAll, prevAll, nextUntil, prevUntil, siblings
         * 剩下的方法名还有：children、contents、next、prev
         * $.unique 将 DOM 元素数组中重复的元素移除
         * 总结来说，当该方法（name）需要一次处理多个元素时，结果集中可能会产生重复的，所以需要去重，否则不需要。
         */
        ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		/* Cool thing
		 * 匹配 parents, parentsUntil, prevUntil, prevAll
		 * 基于本模块核心方法 dir 的移动机制，对结果进行一次倒排，便于正常理解和使用
         */
        if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}
        /* 将新元素集推到 jQuery 栈的最上面，后面的链式调用就可以直接使用了。
         * 并且生成一个 selector 值，这个值可以说明新元素集产生的来源。
         */
		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
    /**
     * @desc 这个方法如果不讲Sizzle的原理，单看这里的话还是很简单的，
     * 即：如果 not 不设置或设置为 false 时，将从 elems 中过滤出满足 expr 选择器的元素，
     * 相反，如果设置 not 为 true，将从 elems 中去除满足 expr 选择器的元素
     * @param expr 过滤选择器
     * @param elems 被操作的元素集
     * @param not {boolean} optinal
     * @return {Array} 满足条件的新数组
     */
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},
    /**
     * @desc 从一个元素出发（不包括出发点和结束点元素），获取迭代搜索方向上的所有元素，直到遇到document对象或遇到until匹配的元素停止
     * @param {Element} elem 起始元素
     * @param {string} dir 迭代搜索方向，可选值：（上）'parentNode'， （右）'nextSibling'、 （左）'previousSibling'
     * @param {string} until 选择器表达式，如果遇到 until 匹配的元素，迭代终止，不包含 until 元素
     * @return {Array}
     */
	dir: function( elem, dir, until ) { // 一个简单的 dir 参数，使得函数支持遍历祖先、兄长、兄弟
		var matched = [],
			cur = elem[ dir ];  // 跳过 elem 自身
        /**
         * 迭代条件解释：
         * cur 节点存在有效，在 DOM 的世界里，元素未找到活不存在的结果都是 null，不是 undefined 。
         * cur.nodeType !== 9 当前元素不是 document 节点，即向上查到 document 停止。注：DOCUMENT_NODE(9)
         * until === undefined 边界未指定，则继续同一方向执行。
         * cur.nodeType !== 1 不是元素节点，则继续同一方向执行。注：ELEMENT_NODE(1)
         * !jQuery( cur ).is( until ) 当前元素不匹配选择器 until，即还没有到边界，则往下执行。
         * 这个布尔表达式也有点意思，执行最后的jQuery.is的隐含条件是：until !== undefined && cur.nodeType === 1
         * 复合的布尔表达式和三元表达式，能减少代码行数、稍微提升性能，但是代码晦涩，不易阅读和维护。
         * 也许看不懂也是jQuery风靡的原因之一
         */
        //
		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
            if ( cur.nodeType === 1 ) {
                matched.push( cur );
            }
            cur = cur[dir];
        }
		return matched;
	},
    /*
     * @desc 简单来说，该方法获取元素 n 的所有后续兄弟元素，包含 n，但不包含elem
     * @param n {Element} 开始计算的元素
     * @param elem {Element} 跳过的元素
     * @return {Array} 从 n 开始直到结束的所有的兄弟元素，如果设置了elem，则不包括 elem
     * 思考，能用 $.dir 方法替代吗？
     */
	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

/**
 * @desc 实现与 filter 和 not 同等的功能，目前只在 .not(selector) 和 .filter(selector) 中有调用
 * @param elements 被处理的元素集
 * @param qualifier {selector|function|element|jQueryObject}
 * @param keep {boolean} 满足 qualifier 条件的是否保留
 * @return {*}
 */
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) { // function
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) { // element
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) { // selector
		// 将所有元素节点找出来放在一个数组中
        var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}
    // 执行到这里只有 qualifier 是 selector ， 并且不满足 isSimple 时
	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
