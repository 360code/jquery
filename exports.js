// jQuery与全局的连接点，将jQuery和$挂载到window上，外放为全局变量，这两个对象指向jQuery框架内部变量——jQuery
// 可以查看intro.js了解整体架构
// 这里是jQuery整体架构中重要的一环，框架内部代码和外部链接的门户
window.jQuery = window.$ = jQuery;

//新版jQuery遵循CommonJS的AMD规范，可见文档：http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}
