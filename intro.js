/*!
 * jQuery JavaScript Library v@VERSION
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: @DATE
 */
/*
 * 第一个有趣的延伸知识点：自执行匿名函数Immediately-Invoked Function Expression (IIFE)
 * 
 * @知识索引：
 * 自执行函数：http://benalman.com/news/2010/11/immediately-invoked-function-expression/
 * 自执行函数的几种写法：http://www.jb51.net/article/31078.htm
 * 匿名函数与闭包：http://www.cnblogs.com/rainman/archive/2009/05/04/1448899.html
 * 
 * @本处使用的作用：
 * 一、创建一个jQuery命名空间，保护jQuery不会和外部冲突
 * 二、为什么这里传入window，其实这里的window是一个局部变量，而不是全局变量window，提高访问性能，且方便压缩
 * 三、为什么传入undefined(属性值上下22对应，下面第二个没有值，即为undefined，那么上面的undefined即使为临时变量，也被重写为真实的undefined)，确保框架内部，undefined是真的使用未定义的undefined，而不是在框架前面被赋值的undefined变量（部分浏览器能重写undefined值）
 */
(function( window, undefined ) {
/*
 * 该部分代码，也在其它文件中，使用自执行匿名函数，且在内部自定义jQuery，且通过挂在window上使其外放
	//注点1，jQuery Core相关部分在这里进行定义，后面的实现是如何来进一步丰满它
	//这块1.8以后和1.7有所改变，1.7这里是一个自执行函数，内部还有一个jQuery的临时变量，通过自执行函数返回，整个过程有点绕
	var jQuery = '……';
	//……
	//Core分享时可忽略，此处只是为了说明jQuery core以外的部分，如何进一步扩展jQuery
	jQuery.Callbacks = '……';
	jQuery.support = '……';
	//……
	// 注点0，jQuery与全局的连接点，将jQuery和$挂载到window上，外放为全局变量，这两个对象指向jQuery框架内部变量——jQuery（注点1）
	window.jQuery = window.$ = jQuery;
	//……
*/
/*
 * 该部分闭合代码在结尾outro.js中
})( window );
*/
