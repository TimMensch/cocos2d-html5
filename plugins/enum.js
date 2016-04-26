"use strict";

console.log("// tslint:disable");
console.log("// eslint:disable");

var path = require('path');
var arrayUniq = require('array-uniq');
var extend = require('node.extend');
var _ = require("lodash");

var mode = "typescript";

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
    "bool":"boolean",
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
    "long":"number",
    "DrawingPrimitiveCanvas":"DrawingPrimitive",
    "Particle.ModeA":"any",
    "Particle.ModeB":"any",
};

if (mode==="typescript") {
    memberTypes.Function = "any";
    memberTypes.function = "any";
    memberTypes.null = "any";
    memberTypes.Null = "any";
}

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
                Image: simpleClass("Image")
            }
        },
    }
};
var prototypes = {};

var inNamespace = 0;
var inClass = false;
var classQueue = [];

var dumpObject = dumpObjectTypeScript;

function dumpChildren(node,isClass,isNamespace) {
    for (var child in node.children) {
        if (node.children.hasOwnProperty(child)) {
            dumpObject(node.children[child],isClass,isNamespace);
        }
    }
}

function notEmpty(o) {
    for (var key in o) {
        if (hasOwnProperty.call(o, key)) return true;
    }
    return false;
}

var namespaces = [];

function globalDec() {
    if (inNamespace || inClass) {
        return "export";
    }
    return "declare";
}

function writeFunction(name,params,returns,scope,isClass) {
    // Constructors are implicitly static and can't return a value
    if (name==="constructor") {
        console.log("\t"+name+"("+params+");");
    } else {
        if (isClass) {
            if (scope==="static") {
                console.log("\tstatic "+name+"("+params+"):",returns,";");
            } else {
                console.log("\t"+name+"("+params+"):",returns,";");
            }
        } else {
            console.log(`${globalDec()} function ${name}(${params}):${returns};`);
        }
    }
}

function dumpObjectTypeScript(node,isClass,isNamespace) {
    if (node.name==="root") {
        dumpChildren(node);
        console.log(`// Modules`);

        for (let namespace of namespaces) {
            if (namespace === "cc") {
                console.log(`declare module "cocos2d" {
    export = ${namespace};
}`);
            } else {
                console.log(`declare module "cocos2d_${namespace}" {
    export = ${namespace};
}`);
            }
            console.log( ``);
        }
        return;
    }
    if (( node.kind === "member" || node.kind === "function")
        && notEmpty(node.children)) {
        node.kind = "namespace";
    }
    if (!inNamespace && node.name==="cc") {
        node.kind = "namespace";
    }
    let forceClass = {
        '$':true,
        "AnimationFrame":true,
        "Camera":true,
        "imeDispatcher":true,
        "saxParser":true,
        "AABB":true
    };

    if (forceClass.hasOwnProperty(node.name)) {
        node.kind = "class";
    }

    switch (node.kind) {
        case "namespace" :
            console.log(`${globalDec()} namespace ${node.name} {`);
            if (!inNamespace) {
                namespaces.push(node.name);
            }
            inNamespace++;
            dumpChildren(node);
            console.log("}");
            inNamespace--;
            break;
        case "class" :
            if (node.name==="DrawingPrimitiveCanvas") {
                node.name = "DrawingPrimitive";
            }
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

            if (node.params || extendString.length>0 ||
                (node.name[0]>="A" && node.name[0]<="Z") ||
                forceClass.hasOwnProperty(node.name)) {
                console.log(`${globalDec()} class ${node.name} ${extendString} {`);
                var ctr = extend({},node);
                ctr = extend(ctr,{kind:"function",name:"constructor",children:{}});
                dumpObjectTypeScript(ctr,true);
                dumpChildren(node,true);
            } else {
                inClass = false;
                inNamespace ++;
                node.kind = "namespace";
                console.log(`${globalDec()} namespace ${node.name} ${extendString} {`);
                dumpChildren(node,false,true);
                inNamespace--;
            }

            console.log("}");
            inClass = false;
            while (classQueue.length>0) {
                dumpObjectTypeScript(classQueue.shift());
            }
            break;
        case "function" :
            if (node.name==="ctor" && node.parentNode && node.parentNode.kind==="namespace") {
                break;
            }
            var returns = fixType(node.returns || "any");
            node.params = node.params || "";
            var name= node.name;

            if (name.includes(".")) {
                name = name.substr(name.lastIndexOf('.')+1);
            }

            writeFunction(name,node.params,returns,node.scope,isClass);

            if (node.extraParams) {
                for (let params of node.extraParams) {
                    writeFunction(name,params,returns,node.scope,isClass);
                }
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
                    console.log("\t"+node.name,":"+type+";");
                }
            } else {
                console.log(`${globalDec()} let ${node.name}:${type};`);
            }
            break;
        default:
//            console.log("what kind?",node);
    }
}

function dumpObjectES6(node,isClass) {
    if (node.name==="root") {
        inNamespace= true;
        console.log("declare module cocos2d {");
        dumpChildren(node);
        console.log("}\n");
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
            if (node.name==="DrawingPrimitiveCanvas") {
                node.name = "DrawingPrimitive";
            }
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
                dumpObjectES6(ctr,true);
            }

            dumpChildren(node,true);
            console.log("}");
            inClass = false;
            while (classQueue.length>0) {
                dumpObjectES6(classQueue.shift());
            }
            break;
        case "function" :
            var returns = node.returns || "any";
            node.params = node.params || "";
            var name= node.name;

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
                    console.log("\t"+node.name,":"+type+";");
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

function hasNull(type) {
    if ((!type) || (!type.names))
        return false;

    for (var j=0; j<type.names.length; ++j) {
        if (type.names[j].toLowerCase()==='null')
            return true;
    }

    return false;
}

function getTypes(type,nullable) {
    var types = [];
    if (!mode==="typescript" && nullable) {
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
            if (types[types.length-1]==="undefined") {
                types.pop();
            }
        }
    } else {
        return "any";
    }
    if (types.length===0) types.push("any");
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

function k_combinations(set, k) {
	var i, j, combs, head, tailcombs;

	// There is no way to take e.g. sets of 5 elements from
	// a set of 4.
	if (k > set.length || k <= 0) {
		return [];
	}

	// K-sized set has only one K-sized subset.
	if (k == set.length) {
		return [set];
	}

	if (k == 1) {
		combs = [];
		for (i = 0; i < set.length; i++) {
			combs.push([set[i]]);
		}
		return combs;
	}
	combs = [];
	for (i = 0; i < set.length - k + 1; i++) {
		// head is a list that includes only our current element.
		head = set.slice(i, i + 1);
		// We take smaller combinations from the subsequent elements
		tailcombs = k_combinations(set.slice(i + 1), k - 1);
		// For each (k-1)-combination we join it with the current
		// and store it to the set of k-combinations.
		for (j = 0; j < tailcombs.length; j++) {
			combs.push(head.concat(tailcombs[j]));
		}
	}
	return combs;
}

function combinations(set) {
	var k, i, combs, k_combs;
	combs = [];

	// Calculate all non-empty k-combinations
	for (k = 1; k <= set.length; k++) {
		k_combs = k_combinations(set, k);
		for (i = 0; i < k_combs.length; i++) {
			combs.push(k_combs[i]);
		}
	}
	return combs;
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
        var searchString = "_p =";
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
        if (e.doclet.longname.match(/[\/<>~]/)) {
            return;
        }
        if (e.doclet.undocumented){
            return;
        }
        if (e.doclet.name.indexOf("_")===0 && !e.doclet.longname.includes("_drawingUtil")) {
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
            thisNode = node.children[e.doclet.name];
            // Don't let an instance definition override a static
            // on the same class.
            if (thisNode.scope!=="static") {
                thisNode.scope=e.doclet.scope;
            }
            thisNode.longname = thisNode.longname || e.doclet.longname;
            if (parent) {
                thisNode.parent = parent;
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
        thisNode.parentNode = node;

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
            var paramArray = [];
            var seenMandatory = false;
            var optionals = [];
            var lastMandatory = -1;

            for (let i=0; i<params.length; ++i) {
                var param = params[i];
                let rest = false;
                if (!param.name || param.name.length===0) {
                    continue;
                }
                if (param.name.indexOf("*")===0) {
                    param.name = "..."+param.name.substr(1);
                    rest = true;
                }
                var p = {
                    name: param.name.replace(/=/,"","g")
                };

                if (param.optional || hasNull(param.type)) {
                    p.optional = true;
                    optionals.push(i);
                } else {
                    lastMandatory = i;
                }
                if (rest && mode==="typescript") {
                    p.type = `Array<${getTypes(param.type)}>`;
                } else {
                    p.type = getTypes(param.type);
                }
                paramArray.push(p);
            }

            var paramSets = [];
            paramSets.push(_.range(0,paramArray.length));
            while (optionals[optionals.length-1]>lastMandatory) {
                optionals.pop();
            }
            if (optionals.length) {
                let combos = combinations(optionals);
                for (let combo of combos) {
                    paramSets.push(_.difference(_.range(0,paramArray.length),combo));
                }
            }

            var paramsArray = [];

            for ( let set of paramSets ) {
                let paramString="";
                for ( let i of set ) {
                    let p = paramArray[i];

                    paramString += p.name;
                    if (p.optional && i>lastMandatory) {
                        paramString += "?";
                    }
                    paramString += ":" + p.type;
                    if (i<paramArray.length-1) {
                        paramString += ',';
                    }
                }
                paramsArray.push(paramString);
            }

            thisNode.params = paramsArray.pop();
            if (paramsArray.length>0) {
                thisNode.extraParams = paramsArray;
            }

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

        var genericParams = "...p:any";
        if (mode==="typescript") {
            genericParams="p1:any,p2?:any,p3?:any,p4?:any,p5?:any,p6?:any";
        }

        if (e.doclet.name==="ctor") {
            thisNode.params = genericParams;

            if (mode==="typescript") {
                if (thisNode.scope !== "static") {
                    thisNode.returns = "this";
                }
            } else {
                thisNode.returns = "any";
            }
        }
        if (e.doclet.name==='create') {
            thisNode.params = genericParams;
        }
        if (e.doclet.name==='addChild') {
            thisNode.params = "child:Node,localZOrder:number,tag?:number|string|Point";
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
        if (e.doclet.name==='initWithDuration') {
            thisNode.params = genericParams;
        }
        if (e.doclet.name==='init') {
            thisNode.params = genericParams;
        }
        if (e.doclet.name==='initWithFile') {
            thisNode.params = genericParams;
        }
        if (e.doclet.name==='initWithAction') {
            thisNode.params = genericParams;
        }
    },
    parseComplete: function() {
        dumpObject(tree);
    }
};
