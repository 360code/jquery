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

// 为 jQuery 实例对象提供扩展方法：
// find, has, not, filter, is, closest, index, add, addBack
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

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

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
	parentsUntil: function( elem, i, until ) { // i应当是后续调用map时传入的index，但是目前并没有用
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
		var ret = jQuery.map( this, fn, until );

		// 若方法名不是以 Until 结尾， 则 ……
        // 实去除以下三个方法，他们拥有相同的参数列表：parentsUntil、 prevUntil、 nextUntil
        if ( !runtil.test( name ) ) {
            selector = until;
        }

		/*
		 * 根据API文档，只有三个以 Until 结尾的方法接受第二个参数
		 * 并且 selector 是用来过滤（filter）用的，
		 * 所以有下面这个if判断，且执行该逻辑
		 */
        if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		// 参考模块开头处，guaranteedUnique[ name ] 为 true 的可能性只有name为 children、contents、next、prev时
        // 所以满足条件的方法名有：parent, parents, parentsUntil, nextAll, prevAll, nextUntil, prevUntil, siblings
        // $.unique 将DOM元素数组中重复的元素移除
        ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		// 匹配 parents, parentsUntil, prevUntil, prevAll
        // 为了结果元素符合正常情况，便于使用，会对结果集进行一个倒排
        if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
    /**
     * @desc
     * @param expr
     * @param elems
     * @param not
     * @return {Array}
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
     * @desc 从一个元素出发（不包括出发点元素），获取迭代搜索方向上的所有元素，直到遇到document对象或遇到until匹配的元素停止
     * @param {Element} elem 起始元素
     * @param {string} dir 迭代搜索方向，可选值：'parentNode'， 'nextSibling'、 'previousSibling'
     * @param {string} until 选择器表达式，如果遇到 until 匹配的元素，迭代终止
     * @return {Array}
     */
	dir: function( elem, dir, until ) { // 一个简单的 dir 参数，使得函数支持遍历祖先、兄长、兄弟
		var matched = [],
			cur = elem[ dir ];  // 跳过 elem 自身
        /**
         * 迭代条件（简化）：cur.nodeType !== 9 && !jQuery( cur ).is( until )
         * 迭代访问，直到遇到document对象或遇到until匹配的元素
         * cur.nodeType !== 9	当前DOM节点cur不是document对象
         * !jQuery( cur ).is( until )	当前DOM节点cur不匹配表达式until
         *
         * until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )
         * 这个布尔表达式也有点意思，执行最后的jQuery.is的隐含条件是：until !== undefined && cur.nodeType === 1
         * 复合的布尔表达式和三元表达式，能减少代码行数、稍微提升性能，但是代码晦涩，不易阅读和维护。
         * 也许看不懂也是jQuery风靡的原因之一
         */
        // DOCUMENT_NODE(9)
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

// Implement the identical functionality for filter and not
// 实现与 filter 和 not 同等的功能
// keep 是一个布尔值
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
