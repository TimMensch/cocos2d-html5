var path = require('path');
var arrayUniq = require('array-uniq');
var extend = require('node.extend');

var memberTypes = {
    "Node.RenderCmd" :"any",
    "math.Matrix4":"Matrix4",
    "Number":"number",
    "Boolean" :"boolean",
    "String" :"string",
    "Null" :"null",
    "Array":"Array<any>",
    "object":"any",
    "Class":"any",
    "Bool":"boolean",
    "ProgressTimer.TYPE_RADIAL":"number",
    "ProgressTimer.TYPE_BAR":"number",
    "CatmullRomBy":"any",
    "Widget":"any",
    "Component":"any",
    "DirectorDelegate":"any",
    "kmMat4":"any",
    "SAXParser":"any",
    "CanvasContextWrapper":"any",
    "*" : "any",
    "enum":"number",
    "WebGLUniformLocation":"any",
    "WebGLProgram":"number",
    "WebGLTexture":"number",
    "array":"Array<any>",
    "HTMLDivElement":"any",
    "Object":"any",
    "EGLView":"any",
    "map_object":"{ [key: string]: any }",
    "IMEKeyboardNotificationInfo":"any",
    "AssetsManager":"any",
    "int":"number",
    "float":"number",
    "long":"number"
};

function simpleClass(name) {
    return {
        kind:'class',
        name:name,
        children:{}
    }
}
var tree = {
    name:"root",
    kind:"namespace",
    children:{
        cp: {
            kind: "namespace",
            name: "cp",
            children: {

            }
        },
        ccui: {
            kind: 'namespace',
            name: "ccui",
            children : {
                Widget : simpleClass("Widget")
            }
        },
        cc :{
            kind: "class",
            name: "cc",
            children:{
                ActionInterval : simpleClass("ActionInterval"),
                loader : simpleClass("loader")
            }
        },
    }
};
var prototypes = {};

var inNamespace = false;
var inClass = false;
var classQueue = [];

function dumpChildren(node,isClass) {
    for (var child in node.children) {
        if (node.children.hasOwnProperty(child)) {
            dumpObject(node.children[child],isClass);
        }
    }
}

function notEmpty(o) {
    for (var key in o) {
        if (hasOwnProperty.call(o, key)) return true;
    }
    return false;
}

function dumpObject(node,isClass) {
    if (node.name==="root") {
        inNamespace= true;
        console.log("declare module cocos2d {");
        dumpChildren(node);
        console.log("}\n");
        console.log("declare var cc : typeof cc ;");
        inNamespace= false;
        return;
    }
    if (( node.kind === "member" || node.kind === "function")
        && notEmpty(node.children)) {
        node.kind = "namespace";
    }
    if (node.kind === "namespace" && (inNamespace||inClass)) {
        node.kind = "class";
    }
    switch (node.kind) {
        case "namespace" :
            inNamespace = true;
            console.log("declare module",node.name,"{");
            dumpChildren(node);
            console.log("}");
            inNamespace = false;
            break;
        case "class" :
            if (inClass) {
                var className = node.name;
                var classTarget = node.name;
                if (node.name==="ModeA" || node.name==="ModeB") {
                    classTarget = node.longname.replace(/[.]/g,"_");
                    node.name = classTarget;
                }
                if (node.type) {
                    console.log("\tstatic",className,":",classTarget,";");
                } else {
                    console.log("\tstatic",className,":typeof",classTarget,";");
                }
                classQueue.push(node);
                break;
            }
            inClass=true;
            var extendString = "";
            if (node.parent && node.parent !== "cc") {
                var parent = fixType(node.parent);

                // We can't use "Class" because it conflicts with
                // FlowType, so instead we'll just inject the Class
                // members in all types that extend Class.
                if (node.parent==="Class"||node.parent==="cc.Class") {
                    node.children.extend = {
                        children:{},
                        name:"extend",
                        kind:"function",
                        scope:"static",
                        params:"props:{ [key: string]: any }",
                        returns:"function"
                    };
                    node.children.implement = {
                        children:{},
                        name:"implement",
                        kind:"function",
                        scope:"static",
                        params:"props:{ [key: string]: any }",
                        returns:"function"
                    };
                } else if (parent!=="any") {
                    extendString = "extends "+parent;
                }
            }
            console.log("declare class",node.name,extendString,"{");

            if (node.params) {
                var ctr = extend({},node);
                ctr = extend(ctr,{kind:"function",name:"constructor",children:{}});
                dumpObject(ctr,true);
            }

            dumpChildren(node,true);
            console.log("}");
            inClass = false;
            while (classQueue.length>0) {
                dumpObject(classQueue.shift());
            }
            break;
        case "function" :
            var returns = node.returns || "any";
            node.params = node.params || "";
            var name= node.name;
            if (name==="ctor")
                name = "constructor";

            // Constructors are implicitly static
            if (name==="constructor") {
                node.scope = "instance";
            }
            if (name.includes(".")) {
                name = name.substr(name.lastIndexOf('.')+1);
            }
            if (isClass) {
                if (node.scope==="static") {
                    console.log("\tstatic "+name+"("+node.params+"):",returns,";");
                } else {
                    console.log("\t"+name+"("+node.params+"):",returns,";");
                }
            } else {
                console.log("declare function "+name+"("+node.params+"):",returns,";");
            }
            break;
        case "constant" :
        // falls through
        case "member" :
            var type = node.type || "any";
            if (isClass) {
                if (node.scope==="static") {
                    console.log("\tstatic",node.name,":"+type+";");
                } else {
                    console.log("\t",node.name,":"+type+";");
                }
            } else {
                console.log("declare var",node.name,":"+type+";");
            }
            break;
        default:
//            console.log("what kind?",node);
    }
}

var lastScope = tree;

function getTypes(type,nullable) {
    var types = [];
    if (nullable) {
        types.push( "null" );
    }
    if (type && type.names) {
        for (var j=0; j<type.names.length; ++j) {
            types.push(fixType(type.names[j]));
            // If any of them are "any", just return
            // "any"
            if (types[types.length-1]==="any") {
                return "any";
            }
        }
    } else {
        return "any";
    }
    types = arrayUniq(types);
    return types.join("|");
}

function getNode(parent,doclet) {
    if (!parent || parent.length===0) {
        return lastScope;
    }
    var members = parent.split('.');
    var node = tree;
    do {
        var element = members.shift();
        if (!(element in node.children)){
            node.children[element]={
                name:element,
                children:{}
            };
        };
        node = node.children[element];
    } while (members.length);
    if (doclet.kind==='class' || doclet.kind==="namespace") {
        lastScope = node;
    }
    return node;
}
function fixType(type) {
    type=type.replace(/^cp./,"");
    type=type.replace(/^ccui./,"");
    type=type.replace(/^cc./,"");
    if (type in memberTypes) {
        return memberTypes[type];
    }
    return type;
}

function countLinesUntil(source,cursor) {
    var i = 0;
    var line = 1;
    while (i!==-1) {
        i = source.indexOf('\n',i);
        if (i>=cursor) {
            return line;
        }
        line++; i++;
    }
    return line;
}

exports.handlers = {
    fileBegin: function() {
        lastScope=tree;
    },
    beforeParse: function(e) {
        var startingPoints=[];
        var cursor = 0;
        var re = /_p[ \t]*=[ \t]*([0-9A-Za-z_.]+)[ \t]*;/;
        var source = e.source;
        var searchString = "var _p =";
        while ( (cursor = source.indexOf(searchString,cursor)) >= 0 ) {
            var m = source.substr(cursor,120).match(re);
            if (m) {
                var line = countLinesUntil(source,cursor);
                startingPoints.push({line:line,p:m[1]});
            }
            cursor+=6;
            searchString = "_p =";
        }
        prototypes[path.normalize(e.filename).toLowerCase()]=startingPoints;
    },
    newDoclet: function(e) {
        // if (e.doclet.name.includes("SHOW_ALL")) {
        //     console.log(e.doclet);
        // }

        if (e.doclet.longname.match(/[\/<>~]/)) {
            return;
        }
        if (e.doclet.undocumented){
            return;
        }
        if (e.doclet.name.indexOf("_")===0) {
            return;
        }
        var memberof = e.doclet.memberof;

        if (memberof && memberof.includes("\n")) {
            e.doclet.description=memberof.substr(memberof.indexOf("\n")+1);
            e.doclet.memberof = memberof = memberof.substr(0,memberof.indexOf("\n"));
        }
        var parent = null;
        if (memberof === "_p") {
            var line = e.doclet.meta.line || e.doclet.meta.lineno;
            var thisPath = path.join(e.doclet.meta.path,e.doclet.meta.filename)
                .toLowerCase();
            var points = prototypes[thisPath];

            var p ;
            for (var i=0;i<points.length;++i) {
                if (line<points[i].line) {
                    continue;
                }

                p = points[i];
                break;
            }
            memberof = p.p;
            if (memberof.includes(".prototype")) {
                memberof = memberof.replace(/[.]prototype/,"");
                e.doclet.scope="instance";
            }
            if (memberof.includes("._ptype")) {
                memberof = memberof.replace(/[.]_ptype/,"");
                e.doclet.scope="instance";
            }
        }

        if (memberof && memberof.indexOf("cc._")===0) {
            //private class
            return;
        }
        var node= getNode(memberof,e.doclet);
        if (e.doclet.augments && e.doclet.augments.length>=1) {
            parent = e.doclet.augments[0];
        }
        var thisNode;
        if (e.doclet.comment.includes("@static")) {
            e.doclet.scope = "static";
        }
        if (e.doclet.name in node.children) {
            thisNode = node.children[e.doclet.name]
            // Don't let an instance definition override a static
            // on the same class.
            if (thisNode.scope!=="static") {
                thisNode.scope=e.doclet.scope;
            }
        } else {
            thisNode = node.children[e.doclet.name]={
                name:e.doclet.name,
                longname:e.doclet.longname,
                scope:e.doclet.scope,
                parent:parent,
                children:{}
            };
        }

        if (thisNode.kind!=='class') {
            thisNode.kind = e.doclet.kind;
        }

        if (e.doclet.name==="audioEngine") {
            thisNode.kind = "class";
        }
        if (e.doclet.type) {
            thisNode.type = getTypes(e.doclet.type);

            memberTypes[e.doclet.name]= getTypes(e.doclet.type);
        }
        if (e.doclet.params) {
            var params = e.doclet.params;
            var paramString = "";

            for (var i=0; i<params.length; ++i) {
                var param = params[i];
                if (!param.name || param.name.length===0) {
                    continue;
                }
                if (param.name.indexOf("*")===0) {
                    param.name = "..."+param.name.substr(1);
                }
                paramString += param.name.replace(/=/,"","g") ;
                if (param.optional) {
                    paramString += "?";
                }
                paramString += ":" + getTypes(param.type);
                if (i<params.length-1) {
                    paramString+=",";
                }
            }
            thisNode.params = paramString;
            if (thisNode.kind!=='class')
                thisNode.kind = "function";

            // if (e.doclet.params) {
            //     console.log(e.doclet.kind,e.doclet.longname,e.doclet.name,e.doclet.memberof,e.doclet.scope,e.doclet.params);
            // } else {
            //     console.log(e.doclet.kind,e.doclet.longname,e.doclet.name,e.doclet.memberof,e.doclet.scope);
            // }
        }

        if (e.doclet.returns) {
            thisNode.kind = "function";
            thisNode.returns = getTypes(e.doclet.returns[0].type,e.doclet.returns[0].nullable);
        }
        if (e.doclet.properties) {
            for (var prop in e.doclet.properties) {
                if (e.doclet.properties.hasOwnProperty(prop)) {
                    var thisProp = e.doclet.properties[prop];
                    thisNode.children[thisProp.name] = {
                        children:{},
                        name:thisProp.name,
                        type:getTypes(thisProp.type),
                        kind:"member",
                        scope:"instance"
                    };
                }
            }
        }

        if (e.doclet.name==='create') {
            thisNode.params = "...p:any";
            thisNode.returns = "any";
        }
        if (e.doclet.name==='initWithDuration') {
            thisNode.params = "...p:any";
        }
        if (e.doclet.name==='init') {
            thisNode.params = "...p:any";
        }
        if (e.doclet.name==='initWithFile') {
            thisNode.params = "...p:any";
        }
        if (e.doclet.name==='initWithAction') {
            thisNode.params = "...p:any";
        }
        if (e.doclet.name==='addChild') {
            thisNode.params = "child:Node,localZOrder:number,tag:number|string|Point";
        }
        if (e.doclet.name==='removeChild') {
            thisNode.params = "child:Node";
        }
        if (e.doclet.name==="reorderChild") {
            thisNode.params = "child:Node,zOrder:number";
        }
        if (e.doclet.name==='startWithTarget') {
            thisNode.params = "target:Node";
        }
        if (e.doclet.name==='reverse') {
            thisNode.returns = "Action";
        }
    },
    parseComplete: function() {
        dumpObject(tree);
    }
};
