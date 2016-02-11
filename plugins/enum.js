var path = require('path');

var tree = {
    name:"root",
    kind:"namespace",
    children:{
        cc :{
            kind: "namespace",
            name: "cc",
            children:{
                loader: {
                    kind:"class",
                    name:"loader",
                    children:{}
                }
            }
        }
    }
};
var prototypes = {};

var inNamespace = false;
function dumpChildren(node,isClass) {
    for (var child in node.children) {
        if (node.children.hasOwnProperty(child)) {
            dumpObject(node.children[child],isClass);
        }
    }
}

function dumpObject(node,isClass) {
    if (node.name==="root") {
        dumpChildren(node);
        return;
    }
    if (node.kind === "member" && node.children.length>0) {
        node.kind = "namespace";
    }
    if (node.kind === "namespace" && inNamespace) {
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
            var extendString = "";
            if (node.parent && node.parent !== "cc") {
                extendString = "extends "+node.parent;
            }
            console.log("declare class",node.name,extendString,"{");
            dumpChildren(node,true);
            console.log("}");
            break;
        case "function" :
            var returns = node.returns || "any";
            node.params = node.params || "";
            if (isClass) {
                console.log("\t"+node.name+"("+node.params+"):",returns,";");
            } else {
                console.log("declare function "+node.name+"("+node.params+"):",returns,";");
            }
            break;
        case "constant" :
        // falls through
        case "member" :
            var type = node.type || "any";
            if (isClass) {
                console.log("\t",node.name,":"+type+";");
            } else {
                console.log("declare var",node.name,":"+type+";");
            }
            break;
        default:
//            console.log("what kind?",node);
    }
}

var lastScope = tree;

function getTypes(type) {
    var types = [];
    if (type && type.names) {
        for (var j=0; j<type.names.length; ++j) {
            types.push(fixType(type.names[j]));
        }
    } else {
        return "any";
    }
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
            node.children[element]={ children:{} };
        };
        node = node.children[element];
    } while (members.length);
    if (doclet.kind==='class' || doclet.kind==="namespace") {
        lastScope = node;
    }
    return node;
}
function fixType(type) {
    switch (type) {
        case "Number": return "number";
        case "Boolean" : return "boolean";
        case "String" : return "string";
        case "Null" : return "null";
        case "Array": return "Array<any>";
        case "object": return "Object";
        case "Bool": return "boolean";
        case "AnimationFrame": return "cc.AnimationFrame";
        case "Class": return "cc.Class";
        default : return type;
    }
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
        //console.log(e);
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
        }

        if (memberof && memberof.indexOf("cc._")===0) {
            //private class
            return;
        }
        var node= getNode(e.doclet.memberof,e.doclet);
//        var name = e.doclet.name.replace(/#$/,"");
        if (e.doclet.name.match("#")) {
            console.log("#",e.doclet);
        }


        if (e.doclet.augments && e.doclet.augments.length>=1) {
            parent = e.doclet.augments[0];
        }

        node.children[e.doclet.name] = {
            name:e.doclet.name,
            longname:e.doclet.longname,
            kind:e.doclet.kind,
            scope:e.doclet.scope,
            parent:parent,
            children:{}
        };
        if (e.doclet.name==="audioEngine") {
            node.children[e.doclet.name].kind = "class";
        }
        if (e.doclet.type) {
            node.children[e.doclet.name].type = getTypes(e.doclet.type);
        }
        if (e.doclet.params) {
            var params = e.doclet.params;
            var paramString = "";

            for (var i=0; i<params.length; ++i) {
                var param = params[i];
                if (!param.name || param.name.length===0) {
                    continue;
                }
                paramString += param.name.replace(/=/,"","g") + ":";

                paramString += getTypes(param.type);
                if (i<params.length-1) {
                    paramString+=",";
                }
            }
            node.children[e.doclet.name].params = paramString;
            node.children[e.doclet.name].kind = "function";
            // if (e.doclet.params) {
            //     console.log(e.doclet.kind,e.doclet.longname,e.doclet.name,e.doclet.memberof,e.doclet.scope,e.doclet.params);
            // } else {
            //     console.log(e.doclet.kind,e.doclet.longname,e.doclet.name,e.doclet.memberof,e.doclet.scope);
            // }
        }

        if (e.doclet.returns) {
            node.children[e.doclet.name].kind = "function";
            node.children[e.doclet.name].returns = getTypes(e.doclet.returns[0].type);
        }

    },
    parseComplete: function() {
        dumpObject(tree);
    }
};
