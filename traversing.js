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

/* Ϊ jQuery ʵ�������ṩ��չ���������ڶԽ�����ĸ������������������жϡ����˵ȣ�
 * �ϸ���˵�����ڱ������루����Ϊ��������jQuery�����Ƿ����� Miscellaneous Traversing ��
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
     * @desc http://api.jquery.com/is/ �漰Sizzle�����ڴ˴η�������
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
     * @desc ��ǰ���Ԫ�ؼ������һЩԪ��
     * @param selector һ�����ڲ���ƥ�������Ԫ�ص�ѡ����
     * @param context �ĵ��в���ƥ�����ʼ��
     */
	add: function( selector, context ) {
        /*
        set
        1.������ַ�������ʹ��jQuery(selector, cxt)��������һ��jq���������ܰ���0������Ԫ�ء�
        ���е�Ԫ�ؿ�����ҳ�������еģ�selector��ѡ��������������docfragment��selector��htmlƬ�Σ�
        2.��������ַ�������õ�һ������0������Ԫ�ص�array��
        all
        ����ǰjQuery���������Ԫ�غ�set�ϲ������array
         */
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );
        /*
         isDisconnected( set[0] ) Ϊ true ��ʾ selector ��һ��htmlƬ�Σ�
         isDisconnected( all[0] ) Ϊ true ��ʾ ��ǰ jQuery �����������һ�� docfragment��
         �����������������ȥ�ص���Ҫ��
         */
		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},
    /* ��� selector Ϊ�գ�����һ�ν��Ԫ�ؼ� push ��jQueryջ�������棬
     * ������� selector ����Ҫ���һ�ι���
     * ������һ������Ȥ������ ���� prevObject ����ָ����һ�ν��jQuery ����
     */
	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

// andSelf �������Ժ� addBack �滻��������ʹ�� addBack��
// �����������ڹٷ� API �ĵ���������ǣ�ǰ�߲����ܲ��������߿�ѡ����һ�����Ҳ���
jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
// ���ĳ���ڵ��Ƿ��� document ��
// DOCUMENT_FRAGMENT_NODE(11)
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}
/**
 * @desc ����ĳ��Ԫ�ص���Ԫ�ػ��Ԫ��
 * @param cur {Element} ������Ԫ��
 * @param dir {string } ���� 'previousSibling' or 'nextSibling'
 * @return {Element}
 */
function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 ); // ELEMENT_NODE(1)

	return cur;
}
// ����Ҫ���巽���Ĳ����б���һ��������ʹ����һ��С���ɣ�����������һ�ѷ���
jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) { // i ����ʲô���أ�
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
        /* this �ǵ��ø� name ������ jQuery ����
         * $.map �Ĺٷ��ĵ���ָ�������������������������ǿ�����ʵ������������
         * ��ʵ�������������Իص����� fn �ĵ�������������ʽ���룬��ʵ����������
         * $.map(arrayOrObject, function (value, indexOrKey, until) { ... }, until)
         * value��һ��HTMLԭ���ڵ�Ԫ�أ� untilֻ��������Until��β�ķ����õõ���jQuery�ӿ��Ұ���
         * ret ��һ������{Array}������������������������Ԫ��
         */
        var ret = jQuery.map( this, fn, until );

        // ���������������˵�һЩ

		/*
         * ʵȥ��������������������ӵ����ͬ�Ĳ����б�
         * ����ͨ�� $.each() ������ӵķ����У�����������������ͬ�Ĳ����б������������ǣ�
         * parentsUntil�� prevUntil�� nextUntil�����ǵĲ����б����磺( elem, i, until )
         * �������������� Until ��β�� ��ֻ����һ�����������磺( selector )
         * ��ʱ�ĵ�һ������ until ���൱�� selector ֵ����������ж�����һ����ֵ����
         * Suck jQuery
         */
        if ( !runtil.test( name ) ) {
            selector = until;
        }

		// ������ںϷ��� selector��������н�����н������ selector ��Ԫ�ع��˳���
        if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		/* �ο�ģ�鿪ͷ����!guaranteedUnique[ name ] Ϊ true �Ŀ�����ֻ��nameΪ����ֵʱ��
         * parent, parents, parentsUntil, nextAll, prevAll, nextUntil, prevUntil, siblings
         * ʣ�µķ��������У�children��contents��next��prev
         * $.unique �� DOM Ԫ���������ظ���Ԫ���Ƴ�
         * �ܽ���˵�����÷�����name����Ҫһ�δ�����Ԫ��ʱ��������п��ܻ�����ظ��ģ�������Ҫȥ�أ�������Ҫ��
         */
        ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		/* Cool thing
		 * ƥ�� parents, parentsUntil, prevUntil, prevAll
		 * ���ڱ�ģ����ķ��� dir ���ƶ����ƣ��Խ������һ�ε��ţ�������������ʹ��
         */
        if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}
        /* ����Ԫ�ؼ��Ƶ� jQuery ջ�������棬�������ʽ���þͿ���ֱ��ʹ���ˡ�
         * ��������һ�� selector ֵ�����ֵ����˵����Ԫ�ؼ���������Դ��
         */
		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
    /**
     * @desc ��������������Sizzle��ԭ����������Ļ����Ǻܼ򵥵ģ�
     * ������� not �����û�����Ϊ false ʱ������ elems �й��˳����� expr ѡ������Ԫ�أ�
     * �෴��������� not Ϊ true������ elems ��ȥ������ expr ѡ������Ԫ��
     * @param expr ����ѡ����
     * @param elems ��������Ԫ�ؼ�
     * @param not {boolean} optinal
     * @return {Array} ����������������
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
     * @desc ��һ��Ԫ�س�����������������ͽ�����Ԫ�أ�����ȡ�������������ϵ�����Ԫ�أ�ֱ������document���������untilƥ���Ԫ��ֹͣ
     * @param {Element} elem ��ʼԪ��
     * @param {string} dir �����������򣬿�ѡֵ�����ϣ�'parentNode'�� ���ң�'nextSibling'�� ����'previousSibling'
     * @param {string} until ѡ�������ʽ��������� until ƥ���Ԫ�أ�������ֹ�������� until Ԫ��
     * @return {Array}
     */
	dir: function( elem, dir, until ) { // һ���򵥵� dir ������ʹ�ú���֧�ֱ������ȡ��ֳ����ֵ�
		var matched = [],
			cur = elem[ dir ];  // ���� elem ����
        /**
         * �����������ͣ�
         * cur �ڵ������Ч���� DOM �������Ԫ��δ�ҵ�����ڵĽ������ null������ undefined ��
         * cur.nodeType !== 9 ��ǰԪ�ز��� document �ڵ㣬�����ϲ鵽 document ֹͣ��ע��DOCUMENT_NODE(9)
         * until === undefined �߽�δָ���������ͬһ����ִ�С�
         * cur.nodeType !== 1 ����Ԫ�ؽڵ㣬�����ͬһ����ִ�С�ע��ELEMENT_NODE(1)
         * !jQuery( cur ).is( until ) ��ǰԪ�ز�ƥ��ѡ���� until������û�е��߽磬������ִ�С�
         * ����������ʽҲ�е���˼��ִ������jQuery.is�����������ǣ�until !== undefined && cur.nodeType === 1
         * ���ϵĲ������ʽ����Ԫ���ʽ���ܼ��ٴ�����������΢�������ܣ����Ǵ����ɬ�������Ķ���ά����
         * Ҳ������Ҳ��jQuery���ҵ�ԭ��֮һ
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
     * @desc ����˵���÷�����ȡԪ�� n �����к����ֵ�Ԫ�أ����� n����������elem
     * @param n {Element} ��ʼ�����Ԫ��
     * @param elem {Element} ������Ԫ��
     * @return {Array} �� n ��ʼֱ�����������е��ֵ�Ԫ�أ����������elem���򲻰��� elem
     * ˼�������� $.dir ���������
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
 * @desc ʵ���� filter �� not ͬ�ȵĹ��ܣ�Ŀǰֻ�� .not(selector) �� .filter(selector) ���е���
 * @param elements �������Ԫ�ؼ�
 * @param qualifier {selector|function|element|jQueryObject}
 * @param keep {boolean} ���� qualifier �������Ƿ���
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
		// ������Ԫ�ؽڵ��ҳ�������һ��������
        var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}
    // ִ�е�����ֻ�� qualifier �� selector �� ���Ҳ����� isSimple ʱ
	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
