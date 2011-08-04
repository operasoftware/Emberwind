/**
 * Utils.js module contains different helper methods
 */

/**
 * Utility place holder
 */
var utils = {};

/**
 * extracts a DOM object contents as a string
 * 
 * @param shaderScript is a DOM element
 * @returns string
 */
utils.getShader = function(shaderScript) {
    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }
    return str;
};

/**
 * resolves shader code
 * 
 * @param shaders is a list of shader code or id elements, defaults to standard identifiers
 * @param document is an DOM object, defaults to current page
 * @returns array of shader codes
 */
utils.resolveShaders = function(shaders, document) {
    if (shaders == null) {
        document = document == null? window.document : document;
        shaders = ["no-texture-vs", "gradient-vs", "texture-vs", "caching-vs", "layer-vs", 
                   "no-texture-fs", "gradient-fs", "alpha-fs", "tint-fs", "caching-fs", "alpha-padding-fs", "tint-padding-fs", "layer-fs"];
    } else {
        assert(shaders.length == 13, "invalid number of shaders");
    }
    // resolve shader code
    var i;
    if (document != null) {
        // cross-browser implementation
        var hash = {}, i, element, elements = document.getElementsByTagName("shader"), shader;
        // get all shaders
        for (i = 0; i < elements.length; i++) {
            element = elements[i];
            hash[element.getAttribute("id")] = this.getShader(element);
        }
        // resolve them
        for (i = 0; i < shaders.length; i++) {
            shader = hash[shaders[i]];
            if (shaders[i] == null) {
                throw new Exception("The following shader couldn't be resolved: " + shaders[i]);
            }
            shaders[i] = shader;
        }
    }
    return shaders;
};

/**
 * creates WebGL render
 * 
 * @param canvas is and HTMLCanvasElement
 * @param shaders is a list of shader code or id elements, defaults to standard identifiers
 * @param document is an DOM object, defaults to current page
 * @returns {RenderWebGL}
 */
utils.createWebGLRender = function(canvas, shaders, document) {
    assert(canvas instanceof HTMLCanvasElement, "invalid canvas: " + canvas);
    // fetch up the shader codes
    shaders = this.resolveShaders(shaders, document);
    // create render
    var vertex = [shaders[0], shaders[1], shaders[2], shaders[2], shaders[3], shaders[2], shaders[2], shaders[4]];
    var fragment = [shaders[5], shaders[6], shaders[7], shaders[8], shaders[9], shaders[10], shaders[11], shaders[12]];
    var render = new RenderWebGL();
    render.initialize(canvas, vertex, fragment);
    return render;
};

/**
 * loads XML and parses it into a bunch of shaders
 * 
 * @param file is an URL.
 * @param ids is an array of shader element id's
 * @param callback is a function that accepts one parameter
 */
utils.loadShaderXml = function(file, ids, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", file, true);
    if (request.overrideMimeType) {
        request.overrideMimeType('application/xml');
    }
    request.onreadystatechange = function() {
        var result;
        if (request.readyState == 4) {
            if (request.status == 404) {
                result = new Exception("Failed to load XML file: " + file);
            } else {
                try {
                    result = utils.resolveShaders(ids, request.responseXML);
                } catch (e) {
                    result = e; 
                }
            }
            callback(result);
        }
    };
    request.send();
};


