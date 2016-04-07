/**
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
 Copyright (c) 2013-2014 Chukong Technologies Inc.
 Copyright (c) 2008, Luke Benstead.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:

 Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.
 Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function(cc){
    /**
     * A 2d vector.
     * @class
     * @param {number} [x]
     * @param {number} [y]
     */
    cc.math.Vec2 = function (x, y) {
        if(y === undefined){
            this.x = x.x;
            this.y = x.y;
        }else{
            this.x = x || 0;
            this.y = y || 0;
        }
    };

    var _p = cc.math.Vec2.prototype;
    _p.fill = function(x, y){   // = cc.kmVec2Fill
        this.x = x;
        this.y = y;
    };

    _p.length = function(){   // = cc.kmVec2Length
        return Math.sqrt(cc.math.square(this.x) + cc.math.square(this.y));
    };

    _p.lengthSq = function(){   // = cc.kmVec2LengthSq
        return cc.math.square(this.x) + cc.math.square(this.y);
    };

    _p.normalize = function(){  // = cc.kmVec2Normalize
        var l = 1.0 / this.length();
        this.x *= l;
        this.y *= l;
        return this;
    };

    /**
     * Add two Vec2 objects and/or Points.
     *
     * @param {cc.Vec2|cc.Point} pOut An object to receive the new value.
     * @param {cc.Vec2|cc.Point} pV1  First element to add.
     * @param {cc.Vec2|cc.Point} pV2  Second element to add.
     */
    cc.math.Vec2.add = function (pOut, pV1, pV2) {     // = cc.kmVec2Add
        pOut.x = pV1.x + pV2.x;
        pOut.y = pV1.y + pV2.y;
        return pOut
    };

    /**
     * Add a Vec2 object and/or Point to this Vec2.
     *
     * @param {cc.Vec2|cc.Point} vec Element to add to this Vec2.
     */
    _p.add = function(vec){   // = cc.kmVec2Add
        this.x += vec.x;
        this.y += vec.y;
        return this;
    };

    /**
     * Calculate the dot product between a Vec2 object and/or Point with this Vec2.
     *
     * @param {cc.Vec2|cc.Point} vec Element to add to this Vec2.
     */
    _p.dot = function (vec) {   //cc.kmVec2Dot
        return this.x * vec.x + this.y * vec.y;
    };

    /**
     * Subtract two Vec2 objects and/or Points.
     *
     * @param {cc.Vec2|cc.Point} pOut An object to receive the new value.
     * @param {cc.Vec2|cc.Point} pV1  First element to subtract.
     * @param {cc.Vec2|cc.Point} pV2  Second element to subtract.
     */
    cc.math.Vec2.subtract = function (pOut, pV1, pV2) {      // = cc.kmVec2Subtract
        pOut.x = pV1.x - pV2.x;
        pOut.y = pV1.y - pV2.y;
        return pOut;
    };

    /**
     * Subtract a Vec2 object and/or Point from this Vec2.
     *
     * @param {cc.Vec2|cc.Point} vec Element to add to this Vec2.
     */
    _p.subtract = function(vec){     // = cc.kmVec2Subtract
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    };

    /**
     * Transform this Vec2 by a Mat3.
     *
     * @param  {cc.Mat3} mat3 Matrix to transform the vector.
     * @return {cc.Vec2} This vector.
     */
    _p.transform = function (mat3) {     // = cc.kmVec2Transform
        var x = this.x, y = this.y;
        this.x = x * mat3.mat[0] + y * mat3.mat[3] + mat3.mat[6];
        this.y = x * mat3.mat[1] + y * mat3.mat[4] + mat3.mat[7];
        return this;
    };

    cc.math.Vec2.scale = function (pOut, pIn, s) {  // = cc.kmVec2Scale
        pOut.x = pIn.x * s;
        pOut.y = pIn.y * s;
        return pOut;
    };

    _p.scale = function(s) {  // = cc.kmVec2Scale
        this.x *= s;
        this.y *= s;
        return this;
    };

    _p.equals = function (vec) {    // = cc.kmVec2AreEqual
        return (this.x < vec.x + cc.math.EPSILON && this.x > vec.x - cc.math.EPSILON) &&
            (this.y < vec.y + cc.math.EPSILON && this.y > vec.y - cc.math.EPSILON);
    };
})(cc);
