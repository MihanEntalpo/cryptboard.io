/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 *
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */
(function (root, factory) {
  if (typeof exports === "object") {
    /* CommonJS */
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    /* AMD module */
    define(factory);
  } else {
    /* Global */
    root.QRCode = factory(document, navigator, CanvasRenderingContext2D);
  }
})(this, function (document, navigator, CanvasRenderingContext2D) {
  "use strict";

  // checking if we are not at client side
  if (typeof document === "undefined" && typeof navigator === "undefined") {
    var Canvas, Image;
    try {
      var Canvas = require("canvas");
      var Image = Canvas.Image;
    } catch (ex) {
      console.warn(
        "QRCode: NodeJS 'canvas' package not loaded/installed. Falling back to TABLE drawing method."
      );
      Canvas = null;
      Image = null;
    }
    var fs = require("fs");
    /**
     * createFakeElementById
     *
     * return an object fake the dom element
     *
     * @id {String}
     * @return {Object}
     */
    var createFakeElementById = function (id) {
      this.id = id;
      this.childNodes = [];
      this.style = {};
    };

    createFakeElementById.prototype.appendChild = function (el) {
      this.childNodes.push(el);
    };

    document = {
      documentElement: {
        tagName: "div",
      },
      getElementById: function (id) {
        return new createFakeElementById(id);
      },
      createElement: function (tagName) {
        var ele;
        // only care about 'canvas' or 'img'
        switch (tagName) {
          case "canvas":
            ele = new Canvas();
            ele.style = {};
            break;
          case "img":
            ele = new Image();
            ele.style = {};
            break;
        }
        return ele;
      },
    };
    CanvasRenderingContext2D = !!(Canvas && Image);
    navigator = {};
  }

  // ---------------------------------------------------------------------
  // QRCode for JavaScript
  //
  // Copyright (c) 2009 Kazuhiko Arase
  //
  // URL: http://www.d-project.com/
  //
  // Licensed under the MIT license:
  //   http://www.opensource.org/licenses/mit-license.php
  //
  // The word "QR Code" is registered trademark of
  // DENSO WAVE INCORPORATED
  //   http://www.denso-wave.com/qrcode/faqpatent-e.html
  //
  // ---------------------------------------------------------------------
  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
    this.parsedData = [];

    // Added to support UTF-8 Characters
    for (var i = 0, l = this.data.length; i < l; i++) {
      var byteArray = [];
      var code = this.data.charCodeAt(i);

      if (code > 0x10000) {
        byteArray[0] = 0xf0 | ((code & 0x1c0000) >>> 18);
        byteArray[1] = 0x80 | ((code & 0x3f000) >>> 12);
        byteArray[2] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[3] = 0x80 | (code & 0x3f);
      } else if (code > 0x800) {
        byteArray[0] = 0xe0 | ((code & 0xf000) >>> 12);
        byteArray[1] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[2] = 0x80 | (code & 0x3f);
      } else if (code > 0x80) {
        byteArray[0] = 0xc0 | ((code & 0x7c0) >>> 6);
        byteArray[1] = 0x80 | (code & 0x3f);
      } else {
        byteArray[0] = code;
      }

      this.parsedData.push(byteArray);
    }

    this.parsedData = Array.prototype.concat.apply([], this.parsedData);

    if (this.parsedData.length != this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }

  QR8bitByte.prototype = {
    getLength: function (buffer) {
      return this.parsedData.length;
    },
    write: function (buffer) {
      for (var i = 0, l = this.parsedData.length; i < l; i++) {
        buffer.put(this.parsedData[i], 8);
      }
    },
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function (data) {
      var newData = new QR8bitByte(data);
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (
        row < 0 ||
        this.moduleCount <= row ||
        col < 0 ||
        this.moduleCount <= col
      ) {
        throw new Error(row + "," + col);
      }
      return this.modules[row][col];
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (var col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) {
        this.setupTypeNumber(test);
      }
      if (this.dataCache == null) {
        this.dataCache = QRCodeModel.createData(
          this.typeNumber,
          this.errorCorrectLevel,
          this.dataList
        );
      }
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    createMovieClip: function (target_mc, instance_name, depth) {
      var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
      var cs = 1;
      this.make();
      for (var row = 0; row < this.modules.length; row++) {
        var y = row * cs;
        for (var col = 0; col < this.modules[row].length; col++) {
          var x = col * cs;
          var dark = this.modules[row][col];
          if (dark) {
            qr_mc.beginFill(0, 100);
            qr_mc.moveTo(x, y);
            qr_mc.lineTo(x + cs, y);
            qr_mc.lineTo(x + cs, y + cs);
            qr_mc.lineTo(x, y + cs);
            qr_mc.endFill();
          }
        }
      }
      return qr_mc;
    },
    setupTimingPattern: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) {
          continue;
        }
        this.modules[r][6] = (r % 2 === 0);
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) {
          continue;
        }
        this.modules[6][c] = (c % 2 === 0);
      }
    },
    setupPositionAdjustPattern: function () {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i];
          var col = pos[j];
          if (this.modules[row][col] != null) {
            continue;
          }
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (
                r === -2 ||
                r === 2 ||
                c === -2 ||
                c === 2 ||
                (r === 0 && c === 0)
              ) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function (test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        this.modules[Math.floor(i / 3)][
          (i % 3) + this.moduleCount - 8 - 3
        ] = mod;

        this.modules[(i % 3) + this.moduleCount - 8 - 3][
          Math.floor(i / 3)
        ] = mod;
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits >> i) & 1) === 1;
        if (i < 6) {
          this.modules[i][8] = mod;
        } else if (i < 8) {
          this.modules[i + 1][8] = mod;
        } else {
          this.modules[this.moduleCount - 15 + i][8] = mod;
        }

        if (i < 8) {
          this.modules[8][this.moduleCount - i - 1] = mod;
        } else if (i < 9) {
          this.modules[8][15 - i - 1 + 1] = mod;
        } else {
          this.modules[8][15 - i - 1] = mod;
        }
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, maskPattern) {
      var inc = -1;
      var row = this.moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) {
          col--;
        }
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              }
              var mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) {
                dark = !dark;
              }
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
  };
  QRCodeModel.PAD0 = 0xec;
  QRCodeModel.PAD1 = 0x11;
  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(
        data.getLength(),
        QRUtil.getLengthInBits(data.mode, typeNumber)
      );
      data.write(buffer);
    }
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(
        "code length overflow. (" +
          buffer.getLengthInBits() +
          ">" +
          totalDataCount * 8 +
          ")"
      );
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCodeModel.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCodeModel.PAD1, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };
  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = 0;
    for (var i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    var data = new Array(totalCodeCount);
    var index = 0;
    for (var i = 0; i < maxDcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }
    for (var i = 0; i < maxEcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }
    return data;
  };
  var QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3,
  };
  var QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2,
  };
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  };
  var QRUtil = {
    PATTERN_POSITION_TABLE: [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170],
    ],
    G15:
      (1 << 10) |
      (1 << 8) |
      (1 << 5) |
      (1 << 4) |
      (1 << 2) |
      (1 << 1) |
      (1 << 0),
    G18:
      (1 << 12) |
      (1 << 11) |
      (1 << 10) |
      (1 << 9) |
      (1 << 8) |
      (1 << 5) |
      (1 << 2) |
      (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^=
          QRUtil.G15 <<
          (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^=
          QRUtil.G18 <<
          (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
      }
      return (data << 12) | d;
    },
    getBCHDigit: function (data) {
      var digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001:
          return i % 2 === 0;
        case QRMaskPattern.PATTERN010:
          return j % 3 === 0;
        case QRMaskPattern.PATTERN011:
          return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case QRMaskPattern.PATTERN101:
          return ((i * j) % 2) + ((i * j) % 3) === 0;
        case QRMaskPattern.PATTERN110:
          return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
        case QRMaskPattern.PATTERN111:
          return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (type >= 1 && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 10;
          case QRMode.MODE_ALPHA_NUM:
            return 9;
          case QRMode.MODE_8BIT_BYTE:
            return 8;
          case QRMode.MODE_KANJI:
            return 8;
          default:
            throw new Error("mode:" + mode);
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 12;
          case QRMode.MODE_ALPHA_NUM:
            return 11;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 10;
          default:
            throw new Error("mode:" + mode);
        }
      } else if (type < 41) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 14;
          case QRMode.MODE_ALPHA_NUM:
            return 13;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 12;
          default:
            throw new Error("mode:" + mode);
        }
      } else {
        throw new Error("type:" + type);
      }
    },
    getLostPoint: function (qrCode) {
      var moduleCount = qrCode.getModuleCount();
      var lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0;
          var dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }
              if (r === 0 && c === 0) {
                continue;
              }
              if (dark == qrCode.isDark(row + r, col + c)) {
                sameCount++;
              }
            }
          }
          if (sameCount > 5) {
            lostPoint += 3 + sameCount - 5;
          }
        }
      }
      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) {
            lostPoint += 3;
          }
        }
      }
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row, col + 1) &&
            qrCode.isDark(row, col + 2) &&
            qrCode.isDark(row, col + 3) &&
            qrCode.isDark(row, col + 4) &&
            !qrCode.isDark(row, col + 5) &&
            qrCode.isDark(row, col + 6)
          ) {
            lostPoint += 40;
          }
        }
      }
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (
            qrCode.isDark(row, col) &&
            !qrCode.isDark(row + 1, col) &&
            qrCode.isDark(row + 2, col) &&
            qrCode.isDark(row + 3, col) &&
            qrCode.isDark(row + 4, col) &&
            !qrCode.isDark(row + 5, col) &&
            qrCode.isDark(row + 6, col)
          ) {
            lostPoint += 40;
          }
        }
      }
      var darkCount = 0;
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col)) {
            darkCount++;
          }
        }
      }
      var ratio =
        Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    },
  };
  var QRMath = {
    glog: function (n) {
      if (n < 1) {
        throw new Error("glog(" + n + ")");
      }
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) {
        n += 255;
      }
      while (n >= 256) {
        n -= 255;
      }
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256),
  };
  for (var i = 0; i < 8; i++) {
    QRMath.EXP_TABLE[i] = 1 << i;
  }
  for (var i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] =
      QRMath.EXP_TABLE[i - 4] ^
      QRMath.EXP_TABLE[i - 5] ^
      QRMath.EXP_TABLE[i - 6] ^
      QRMath.EXP_TABLE[i - 8];
  }
  for (var i = 0; i < 255; i++) {
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  }

  function QRPolynomial(num, shift) {
    if (num.length == null) {
      throw new Error(num.length + "/" + shift);
    }
    var offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  QRPolynomial.prototype = {
    get: function (index) {
      return this.num[index];
    },
    getLength: function () {
      return this.num.length;
    },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(
            QRMath.glog(this.get(i)) + QRMath.glog(e.get(j))
          );
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) {
        return this;
      }
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) {
        num[i] = this.get(i);
      }
      for (var i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e);
    },
  };

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  QRRSBlock.RS_BLOCK_TABLE = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];
  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == null) {
      throw new Error(
        "bad rs block @ typeNumber:" +
          typeNumber +
          "/errorCorrectLevel:" +
          errorCorrectLevel
      );
    }
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0];
      var totalCount = rsBlock[i * 3 + 1];
      var dataCount = rsBlock[i * 3 + 2];
      for (var j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  };
  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectLevel.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectLevel.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectLevel.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return undefined;
    }
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      var bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      }
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      }
      this.length++;
    },
  };
  var QRCodeLimitLength = [
    [17, 14, 11, 7],
    [32, 26, 20, 14],
    [53, 42, 32, 24],
    [78, 62, 46, 34],
    [106, 84, 60, 44],
    [134, 106, 74, 58],
    [154, 122, 86, 64],
    [192, 152, 108, 84],
    [230, 180, 130, 98],
    [271, 213, 151, 119],
    [321, 251, 177, 137],
    [367, 287, 203, 155],
    [425, 331, 241, 177],
    [458, 362, 258, 194],
    [520, 412, 292, 220],
    [586, 450, 322, 250],
    [644, 504, 364, 280],
    [718, 560, 394, 310],
    [792, 624, 442, 338],
    [858, 666, 482, 382],
    [929, 711, 509, 403],
    [1003, 779, 565, 439],
    [1091, 857, 611, 461],
    [1171, 911, 661, 511],
    [1273, 997, 715, 535],
    [1367, 1059, 751, 593],
    [1465, 1125, 805, 625],
    [1528, 1190, 868, 658],
    [1628, 1264, 908, 698],
    [1732, 1370, 982, 742],
    [1840, 1452, 1030, 790],
    [1952, 1538, 1112, 842],
    [2068, 1628, 1168, 898],
    [2188, 1722, 1228, 958],
    [2303, 1809, 1283, 983],
    [2431, 1911, 1351, 1051],
    [2563, 1989, 1423, 1093],
    [2699, 2099, 1499, 1139],
    [2809, 2213, 1579, 1219],
    [2953, 2331, 1663, 1273],
  ];

  function _isSupportCanvas() {
    return (
      typeof CanvasRenderingContext2D !== "undefined" &&
      typeof CanvasRenderingContext2D.prototype.drawImage === "function"
    );
  }

  // android 2.x doesn't support Data-URI spec
  function _getAndroid() {
    var android = false;
    var sAgent = navigator.userAgent;

    if (/android/i.test(sAgent)) {
      // android
      android = true;
			var aMat = sAgent.toString().match(/android ([0-9]+\.?[0-9]*)/i);

      if (aMat && aMat[1]) {
        android = parseFloat(aMat[1]);
      }
    }

    return android;
  }

  /**
   * draw by SVG
   * @returns {Function}
   * @constructor
   */
  function createSVGDrawer() {
    var Drawing = function (el, htOption) {
      this._el = el;
      this._htOption = htOption;
    };

    Drawing.prototype.renderMode = "SVG";

    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption;
      var _el = this._el;
      var width = _htOption.width;
      var height = _htOption.height;
      var border = _htOption.border;
      var margin = _htOption.margin + border;
      var drawOnlyDark = _htOption.drawOnlyDark;
      var noSmoothing = _htOption.noSmoothing;
      var removeAntiAliasing = _htOption.removeAntiAliasing;
      var nCount = oQRCode.getModuleCount();
      var nRenderCount = nCount + 2 * margin;
      var nWidth = width / nRenderCount;
      var nHeight = height / nRenderCount;
      var nDrawnWidth = nWidth * _htOption.blockRatio;
      var nDrawnHeight = nHeight * _htOption.blockRatio;
      if (removeAntiAliasing) {
        nWidth = Math.floor(nWidth);
        nHeight = Math.floor(nHeight);
        nDrawnWidth = Math.floor(nDrawnWidth);
        nDrawnHeight = Math.floor(nDrawnHeight);
      }
      var nBorderWidth = border * nWidth;
      var nBorderHeight = border * nHeight;

      var marginX =
        (margin + (1 - _htOption.blockRatio) / 2) * nWidth +
        (width - nWidth * nRenderCount) / 2;
      var marginY =
        (margin + (1 - _htOption.blockRatio) / 2) * nHeight +
        (height - nHeight * nRenderCount) / 2;
      if (removeAntiAliasing) {
        marginX = Math.floor(marginX);
        marginY = Math.floor(marginY);
      }

      this.clear();

      function makeSVG(tag, attrs, el) {
        if (!el) {
          el = _el.ownerDocument.createElementNS(
            "http://www.w3.org/2000/svg",
            tag
          );
        }

        for (var k in attrs) {
          if (attrs.hasOwnProperty(k)) {
            el.setAttribute(k, attrs[k]);
          }
        }
        return el;
      }

      var svg = makeSVG(
        "svg",
        {
          viewBox: "0 0 " + width + " " + height,
          width: width + "px",
          height: height + "px",
          fill: _htOption.colorLight,
        },
        // use the `_el` SVG element, iff it is an SVG element, otherwise
        // add a SVG child element to `_el`:
        isSvgNode(_el) ? _el : null
      );

      svg.setAttributeNS(
        "http://www.w3.org/2000/xmlns/",
        "xmlns:xlink",
        "http://www.w3.org/1999/xlink"
      );
      if (svg !== _el) {
        _el.appendChild(svg);
      }

      if (!drawOnlyDark) {
        svg.appendChild(
          makeSVG("rect", {
            fill: _htOption.colorLight,
            width: "100%",
            height: "100%",
          })
        );
      }
      // render border as a fill, rather than a stroke
      //
      // See also: https://stackoverflow.com/questions/7241393/can-you-control-how-an-svgs-stroke-width-is-drawn
      if (border) {
        svg.appendChild(
          makeSVG("rect", {
            fill: _htOption.colorBorder,
            x: 0,
            y: 0,
            width: width,
            height: nBorderHeight,
          })
        );
        svg.appendChild(
          makeSVG("rect", {
            fill: _htOption.colorBorder,
            x: 0,
            y: height - nBorderHeight,
            width: width,
            height: nBorderHeight,
          })
        );
        svg.appendChild(
          makeSVG("rect", {
            fill: _htOption.colorBorder,
            x: 0,
            y: nBorderHeight,
            width: nBorderWidth,
            height: height - 2 * nBorderHeight,
          })
        );
        svg.appendChild(
          makeSVG("rect", {
            fill: _htOption.colorBorder,
            x: width - nBorderWidth,
            y: nBorderHeight,
            width: nBorderWidth,
            height: height - 2 * nBorderHeight,
          })
        );
      }

      // set up template dot; the pixel in the top-left corner of the QRcode is always set/black,
      // so we place the template pixel there:
      svg.appendChild(
        makeSVG("rect", {
          fill: _htOption.colorDark,
          x: marginX,
          y: marginY,
          width: nDrawnWidth,
          height: nDrawnHeight,
          id: "template",
          "shape-rendering": "crispEdges",
        })
      );

      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          if (oQRCode.isDark(row, col)) {
            // place these pixels RELATIVE to the template pixel, hence
            // there's no need to add `margin` t `col` and `row` here.
            var child = makeSVG("use", {
              x: col * nWidth,
              y: row * nHeight,
            });
            child.setAttributeNS(
              "http://www.w3.org/1999/xlink",
              "href",
              "#template"
            );
            svg.appendChild(child);
          }
        }
      }
    };

    Drawing.prototype.clear = function () {
      var _el = this._el;
      while (_el.hasChildNodes()) {
        _el.removeChild(_el.lastChild);
      }
    };

    return Drawing;
  }

  function isSvgNode(el) {
    return el && (el.tagName.toLowerCase() === "svg");
  }

  /**
   * draw by table
   * @returns {Function}
   * @constructor
   */
  function createTableDrawer() {
    var Drawing = function (el, htOption) {
      this._el = el;
      this._htOption = htOption;
    };

    Drawing.prototype.renderMode = "TABLE";

    /**
     * Draw the QRCode
     *
     * @param {QRCode} oQRCode
     */
    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption;
      var _el = this._el;
      var _htOption = this._htOption;
      var _el = this._el;

      // TABLE rendering has a few quirks, at least in Chrome, where, despite
      // precise width/height/collapse specs, the tables turn out to be slightly
      // different in size from what one might expect, including vertical
      // stretching/compression.
      //
      // The way to cope with the horizontal width error is to force the width
      // of the TABLE itself, which will cause Chrome to render some columns
      // slightly compressed or stretched to make the table fit the specified
      // WIDTH exactly.
      //
      // The same approach unfortunately DOES NOT WORK for the vertical size,
      // which, after having tried a few approaches, we leave untouched in this
      // code as there's little we can do about it, while generally the
      // vertical size is not as critical as the horizontal in web pages.
      //
      // We also limit the number of attempts to get it right as we cannot
      // force Chrome to render a precise table for many sizes; the current
      // code only checks the width, so we EXPECT to execute the code below
      // only once; still, we limit the number of loops to prevent run-away
      // under spurious conditions / other browsers.
      var factor = 1;
      for (var loop = 5; loop > 0; loop--) {
        var width = _htOption.width * factor;
        var height = _htOption.height * factor;
        var border = _htOption.border;
        var margin = _htOption.margin + border;
        var nCount = oQRCode.getModuleCount();
        var nRenderCount = nCount + 2 * margin;
        var nWidth = width / nRenderCount;
        var nHeight = height / nRenderCount;
        var nBorderWidth = border * nWidth;
        var nBorderHeight = border * nHeight;
        var nDrawnWidth = nWidth * _htOption.blockRatio;
        var nDrawnHeight = nHeight * _htOption.blockRatio;

        var styleDef = {
          border: 0,
          "border-collapse": "collapse",
          padding: 0,
          margin: 0,
          "-webkit-border-horizontal-spacing": 0,
          "-webkit-border-vertical-spacing": 0,
        };
        var style = [
          "background-color",
          ":" + _htOption.colorLight + "; ",
          "width",
          ":" + nWidth + "px; ",
          "height",
          ":" + nHeight + "px; ",
        ];
        for (var attr in styleDef) {
          style.push(attr, ": " + styleDef[attr] + "; ");
        }
        var lightStyle = style.join("");
        style[1] = ":" + _htOption.colorDark + "; ";
        var darkStyle = style.join("");
        style[1] = ":" + _htOption.colorBorder + "; ";
        var borderStyle = style.join("");
        style[1] = ":" + _htOption.colorLight + "; ";
        style[3] = ":" + width + "px; ";
        style[5] = ":" + height + "px; ";
        var tableStyle = style.join("");

        var aHTML = ['<table style="' + tableStyle + '">'];

        for (var row = 0; row < margin; row++) {
          aHTML.push('<tr style="border-collapse:collapse;">');

          for (var col = 0; col < nRenderCount; col++) {
            aHTML.push(
              '<td style="' +
                (row < border || col < border || col >= nRenderCount - border
                  ? borderStyle
                  : lightStyle) +
                ';"></td>'
            );
          }

          aHTML.push("</tr>");
        }

        for (var row = 0; row < nCount; row++) {
          aHTML.push('<tr style="border-collapse:collapse;">');

          for (var col = 0; col < margin; col++) {
            aHTML.push(
              '<td style="' +
                (col < border ? borderStyle : lightStyle) +
                ';"></td>'
            );
          }

          for (var col = 0; col < nCount; col++) {
            aHTML.push(
              '<td style="' +
                (oQRCode.isDark(row, col) ? darkStyle : lightStyle) +
                ';"></td>'
            );
          }

          for (var col = 0; col < margin; col++) {
            aHTML.push(
              '<td style="' +
                (col >= margin - border ? borderStyle : lightStyle) +
                ';"></td>'
            );
          }

          aHTML.push("</tr>");
        }

        for (var row = 0; row < margin; row++) {
          aHTML.push('<tr style="border-collapse:collapse;">');

          for (var col = 0; col < nRenderCount; col++) {
            aHTML.push(
              '<td style="' +
                (row >= margin - border ||
                col < border ||
                col >= nRenderCount - border
                  ? borderStyle
                  : lightStyle) +
                ';"></td>'
            );
          }

          aHTML.push("</tr>");
        }

        aHTML.push("</table>");
        _el.innerHTML = aHTML.join("");

        // Fix the margin values as real size.
        var elTable = _el.childNodes[0];

        console.log("QRcode table info: ", {
          factor,
          width,
          height,
          actualWidth: elTable.offsetWidth,
          actualHeight: elTable.offsetHeight,
        });
        if (width === elTable.offsetWidth) {
          break;
        }
        factor *= width / elTable.offsetWidth;
      }

      if (_htOption.class) {
        elTable.className = _htOption.class;
      }
    };

    /**
     * Clear the QRCode
     */
    Drawing.prototype.clear = function () {
      this._el.innerHTML = "";
    };

    return Drawing;
  }

  /**
   * draw by canvas
   * @returns {Function}
   */
  function createCanvasDrawer() {
    // Drawing in Canvas
    var _bSupportDataURI = null;

    // success callback for image render:
    function _onMakeImage() {
      this._elImage.src = this._elCanvas.toDataURL("image/png");
      this._elImage.style.display = null;
      this._elCanvas.style.display = null;
      if (this._htOption.success) {
        this._htOption.success.call(this, this._elImage);
      }
    }

    // failure callback for image render:
    function _onNotMadeImage() {
      this._elImage.src = "";
      this._elImage.style.display = "none";
      this._elCanvas.style.display = null;
      // invoke the user error callback, unless there isn't one, in which case
      // we invoke the success callback with a FALSE parameter.
      if (this._htOption.error) {
        this._htOption.error.call(this);
      } else if (this._htOption.success) {
        this._htOption.success.call(this, false);
      }
    }

    // Android 2.1 bug workaround
    // http://code.google.com/p/android/issues/detail?id=5141
    var _android = _getAndroid();
    if (_android && _android <= 2.1) {
      var factor = 1 / window.devicePixelRatio;
      var drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (
        image,
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        dw,
        dh
      ) {
        if (("nodeName" in image) && /img/i.test(image.nodeName)) {
          for (var i = arguments.length - 1; i >= 1; i--) {
            arguments[i] = arguments[i] * factor;
          }
        } else if (typeof dw === "undefined") {
          arguments[1] *= factor;
          arguments[2] *= factor;
          arguments[3] *= factor;
          arguments[4] *= factor;
        }

        drawImage.apply(this, arguments);
      };
    }

    /**
     * Check whether the user's browser supports Data URI or not
     *
     * @private
     * @param {Function} fSuccess Occurs if it supports Data URI
     * @param {Function} fFail Occurs if it doesn't support Data URI
     */
    function _safeSetDataURI(fSuccess, fFail) {
      var self = this;

      // Check it just once
      if (_bSupportDataURI == null) {
        var fOnError = function () {
          _bSupportDataURI = false;

          if (fFail) {
            fFail.call(self);
          }
        };
        var fOnSuccess = function () {
          _bSupportDataURI = true;

          if (fSuccess) {
            fSuccess.call(self);
          }
        };

        // Android below 3 doesn't support Data-URI spec.
        if (!this._android || this._android >= 3) {
          var el = document.createElement("img");
          el.onabort = fOnError;
          el.onerror = fOnError;
          el.onload = fOnSuccess;
          el.src =
            "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
        } else {
          fOnError();
        }
      } else if (_bSupportDataURI === true && fSuccess) {
        fSuccess.call(self);
      } else if (_bSupportDataURI === false && fFail) {
        fFail.call(self);
      }
    }

    /**
     * Drawing QRCode by using canvas
     *
     * @constructor
     * @param {HTMLElement} el
     * @param {Object} htOption QRCode Options
     */
    var Drawing = function (el, htOption) {
      this._android = _getAndroid();

      this._htOption = htOption;
      this._elCanvas = el.ownerDocument.createElement("canvas");
      this._elCanvas.width = htOption.width;
      this._elCanvas.height = htOption.height;
      /* ignore canvas? */
      el.appendChild(this._elCanvas);
      this._el = el;
      this._oContext = this._elCanvas.getContext("2d");
      // create new img only when no targetImage.
      var targetImage = htOption.targetImage;
      var imgParent = this._el;
      // when referenced DOM node is not an <IMG>, we place a new <IMG> as a child:
      if (targetImage.tagName.toLowerCase() !== "img") {
        imgParent = targetImage;
        targetImage = null;
      }
      this._elImage = targetImage || el.ownerDocument.createElement("img");

      if (!targetImage) {
        if (htOption.class) {
          this._elImage.className = htOption.class;
        }
        this._elImage.alt = "Scan me!";
        this._elImage.style.display = "none";
        imgParent.appendChild(this._elImage);
      }
      // disable image when we already know the environment does not support image data URIs:
      _safeSetDataURI.call(this);
      if (_bSupportDataURI === false) {
        this._elImage.src = "";
        this._elImage.style.display = "none";
      }
    };

    Drawing.prototype.renderMode = "CANVAS";

    /**
     * Draw the QRCode
     *
     * @param {QRCode} oQRCode
     */
    Drawing.prototype.draw = function (oQRCode) {
      var _oContext = this._oContext;
      var _htOption = this._htOption;
      var width = _htOption.width;
      var height = _htOption.height;
      var border = _htOption.border;
      var margin = _htOption.margin + border;
      var drawOnlyDark = _htOption.drawOnlyDark;
      var noSmoothing = _htOption.noSmoothing;
      var removeAntiAliasing = _htOption.removeAntiAliasing;

      var nCount = oQRCode.getModuleCount();
      var nRenderCount = nCount + 2 * margin;
      var nWidth = width / nRenderCount;
      var nHeight = height / nRenderCount;
      var nDrawnWidth = nWidth * _htOption.blockRatio;
      var nDrawnHeight = nHeight * _htOption.blockRatio;
      if (removeAntiAliasing) {
        nWidth = Math.floor(nWidth);
        nHeight = Math.floor(nHeight);
        nDrawnWidth = Math.floor(nDrawnWidth);
        nDrawnHeight = Math.floor(nDrawnHeight);
      }
      var nBorderWidth = border * nWidth;
      var nBorderHeight = border * nHeight;

      this._elImage.style.display = "none";

      if (noSmoothing) {
        _oContext.webkitImageSmoothingEnabled = false;
        _oContext.mozImageSmoothingEnabled = false;
        _oContext.imageSmoothingEnabled = false;
      }

      if (!drawOnlyDark) {
        _oContext.fillStyle = _htOption.colorLight;
        _oContext.fillRect(0, 0, width, height);
      }

      // Fill quiet zone's border with border color
      _oContext.strokeStyle = _htOption.colorBorder;
      _oContext.lineWidth = 1;
      _oContext.fillStyle = _htOption.colorBorder;
      _oContext.fillRect(0, 0, width, nBorderHeight);
      _oContext.fillRect(0, height - nBorderHeight, width, nBorderHeight);
      _oContext.fillRect(
        0,
        nBorderHeight,
        nBorderWidth,
        height - 2 * nBorderHeight
      );
      _oContext.fillRect(
        width - nBorderWidth,
        nBorderHeight,
        nBorderWidth,
        height - 2 * nBorderHeight
      );

      var marginX =
        (margin + (1 - _htOption.blockRatio) / 2) * nWidth +
        (width - nWidth * nRenderCount) / 2;
      var marginY =
        (margin + (1 - _htOption.blockRatio) / 2) * nHeight +
        (height - nHeight * nRenderCount) / 2;
      if (removeAntiAliasing) {
        marginX = Math.floor(marginX);
        marginY = Math.floor(marginY);
      }

      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          var bIsDark = oQRCode.isDark(row, col);
          if (!bIsDark && drawOnlyDark) {
            continue;
          }
          var nLeft = col * nWidth + marginX;
          var nTop = row * nHeight + marginY;
          _oContext.strokeStyle = bIsDark
            ? _htOption.colorDark
            : _htOption.colorLight;
          _oContext.lineWidth = 1;
          _oContext.fillStyle = bIsDark
            ? _htOption.colorDark
            : _htOption.colorLight;

          _oContext.fillRect(nLeft, nTop, nDrawnWidth, nDrawnHeight);
        }
      }

      if (removeAntiAliasing) {
        // Anti-aliasing removal
        var imageData = this._oContext.getImageData(
          margin,
          margin,
          width,
          height
        );
        var data = imageData.data;
        for (var y = 0; y < height; ++y) {
          for (var x = 0; x < width; ++x) {
            var index = (y * width + x) * 4;
            if (data[index] !== 0 && data[index] !== 255) {
              var color = (data[index] >= 128 ? 255 : 0);
              data[index] = color;
              data[++index] = color;
              data[++index] = color;
              data[++index] = 255;
            }
          }
        }

        this._oContext.putImageData(imageData, margin, margin);
        // End Anti-aliasing
      }
    };

    /**
     * Make the image from Canvas if the browser supports Data URI.
     */
    Drawing.prototype.makeImage = function () {
      _safeSetDataURI.call(this, _onMakeImage, _onNotMadeImage);
    };

    /**
     * Clear the QRCode
     */
    Drawing.prototype.clear = function () {
      this._oContext.clearRect(
        0,
        0,
        this._elCanvas.width,
        this._elCanvas.height
      );

      this._elImage.src = "";
      this._elImage.style.display = "none";
    };

    /**
     * Check if environment supports image data URIs.
     *
     * WARNING: the first call to this API may invoke async code. Then the answer
     * will be returned through the callback: a `true` or `false` value of the
     * first callback function parameter will tell the caller whether there is
     * (or is NOT) image data URI support in the present environment.
     *
     * When the async test code is invoked, the direct return value is NULL,
     * while otherwise the direct return value is TRUE or FALSE.
     *
     * @return {Boolean} TRUE or FALSE when the async detection logic has
     * already produced a verdict. Otherwise NULL.
     */
    Drawing.prototype.hasImageSupport = function (callback) {
      var self = this;

      if (_bSupportDataURI == null) {
        var cb = function () {
          if (callback) {
            callback.call(self, false);
          }
        };
        _safeSetDataURI.call(this, cb, cb);
      }
      return _bSupportDataURI;
    };

    return Drawing;
  }

  var svgDrawer = createSVGDrawer();
  var tableDrawer = createTableDrawer();
  var canvasDrawer = createCanvasDrawer();

  /**
   * Get the type by string length
   *
   * @private
   * @param {String} sText
   * @param {Number} nCorrectLevel
   * @return {Number} type
   */
  function _getTypeNumber(sText, nCorrectLevel) {
    var nType = 1;
    var length = _getUTF8Length(sText);

    for (var i = 0, len = QRCodeLimitLength.length; i < len; i++) {
      var nLimit = 0;

      switch (nCorrectLevel) {
        case QRErrorCorrectLevel.L:
          nLimit = QRCodeLimitLength[i][0];
          break;
        case QRErrorCorrectLevel.M:
          nLimit = QRCodeLimitLength[i][1];
          break;
        case QRErrorCorrectLevel.Q:
          nLimit = QRCodeLimitLength[i][2];
          break;
        case QRErrorCorrectLevel.H:
          nLimit = QRCodeLimitLength[i][3];
          break;
        default:
          throw new Error("invalid nCorrectLevel setting");
      }

      if (length <= nLimit) {
        break;
      } else {
        nType++;
      }
    }

    if (nType > QRCodeLimitLength.length) {
      throw new Error("Too long data");
    }

    return nType;
  }

  function _getUTF8Length(sText) {
    var replacedText = encodeURI(sText)
      .toString()
      .replace(/\%[0-9a-fA-F]{2}/g, "a");
    return replacedText.length + (replacedText.length != sText.length ? 3 : 0);
  }

  /**
   * @class QRCode
   * @constructor
   * @example
   * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
   *
   * @example
   * var oQRCode = new QRCode("test", {
   *    text : "http://naver.com",
   *    width : 128,
   *    height : 128
   * });
   *
   * oQRCode.clear(); // Clear the QRCode.
   * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
   *
   * @param {HTMLElement|String} el target element or 'id' attribute of element.
   * @param {Object|String} vOption
   * @param {String} vOption.text QRCode link data
   * @param {Number} [vOption.width=256]
   * @param {Number} [vOption.height=256]
   * @param {Number} [vOption.border=4] default to 1 module
   * @param {String} [vOption.colorDark="#000000"]
   * @param {String} [vOption.colorLight="#ffffff"]
   * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
   */
  var QRCode = function (el, vOption) {
    this._htOption = {
      width: 256,
      height: 256,
      typeNumber: 4,
      blockratio: 1,
      colorDark: "#000000",
      colorLight: "#ffffff",
      colorBorder: "#ff0000",
      correctLevel: QRErrorCorrectLevel.H,
      border: 1,
      margin: 10,
      class: "qrcode-img",
      useSVG: false,
      useTABLE: false,
      cover: null, // URL
      targetImage: null, // DOMElement
      text: null,
      title: null,
      success: null, // function (DOM_image_element OR false)
      error: null, // function ()
    };

    if (typeof vOption === "string") {
      vOption = {
        text: vOption,
      };
    }

    // Overwrites options
    if (vOption) {
      for (var i in vOption) {
        if (Object.prototype.hasOwnProperty.call(vOption, i)) {
          this._htOption[i] = vOption[i];
        }
      }
    }

    // correct/check important options:
    this._htOption.blockRatio *= 1; // force option value to Number type
    if (
      !isFinite(this._htOption.blockRatio) ||
      this._htOption.blockRatio <= 0.1 ||
      this._htOption.blockRatio >= 1
    ) {
      this._htOption.blockRatio = 1;
    }

    if (typeof el === "string") {
      el = document.getElementById(el);
    }
    // check if reference is a jQuery node or a DOM node: if it is a jQuery node,
    // turn it into a DOM node:
    else if (typeof el.get === "function") {
      el = el.get(0);
    }
    // Make sure we reference the SVG container node, not just a SVG element:
    if (el.ownerSVGElement) {
      el = el.ownerSVGElement;
    }

    // check if reference is a jQuery node or a DOM node: if it is a jQuery node,
    // turn it into a DOM node:
    if (
      this._htOption.targetImage &&
      typeof this._htOption.targetImage.get === "function"
    ) {
      this._htOption.targetImage = this._htOption.targetImage.get(0);
    }

    var Drawing;
    if (this._htOption.useSVG || isSvgNode(el)) {
      Drawing = svgDrawer;
    } else if (!this._htOption.useTABLE && _isSupportCanvas()) {
      Drawing = canvasDrawer;
    } else {
      Drawing = tableDrawer;
    }

    this._android = _getAndroid();
    this._el = el;
    this._el.innerHTML = "";
    this._oQRCode = null;
    this._oDrawing = new Drawing(this._el, this._htOption);
    this.renderMode = this._oDrawing.renderMode;

    if (this._htOption.text) {
      this.makeCode(this._htOption.text, this._htOption.title);
    }
  };

  /**
   * Make the QRCode
   *
   * @param {String} sText link data
   */
  QRCode.prototype.makeCode = function (sText, title) {
    var _htOption = this._htOption;
    var self = this;

    if (!sText) {
      throw new Error("makeCode() takes in a text parameter");
    }
    if (title === undefined) {
      title = _htOption.title;
    }

    this._oDrawing.clear();
    this._oQRCode = new QRCodeModel(
      _getTypeNumber(sText, _htOption.correctLevel),
      _htOption.correctLevel
    );
    this._oQRCode.addData(sText);
    this._oQRCode.make();
    this._el.title = (title !== undefined) ? title : sText;

    if (_htOption.cover) {
      // var overlayDrawOptions = JSON.parse(JSON.stringify(_htOption));

      // if (_htOption.overlayOptions) {
      //     for (var key in _htOption.overlayOptions) {
      //         if (key !== 'text') {
      //             overlayDrawOptions[key] = _htOption.overlayOptions[key];
      //         }
      //     }
      // }

      this._oDrawing.draw(this._oQRCode);

      var coverImage = new Image();
      coverImage.src = _htOption.cover;
      coverImage.onload = function () {
        self._oDrawing._oContext.drawImage(
          coverImage,
          0,
          0,
          _htOption.width,
          _htOption.height
        );
        self._oDrawing.draw(self._oQRCode);
        self.makeImage();
      };
    } else {
      this._oDrawing.draw(this._oQRCode);
      this.makeImage();
    }
  };

  /**
   * Make the Image from Canvas element
   * - It occurs automatically
   *
   * @private
   */
  QRCode.prototype.makeImage = function () {
    if (typeof this._oDrawing.makeImage === "function") {
      this._oDrawing.makeImage();
    } else {
      // invoke the user error callback, unless there isn't one, in which case
      // we invoke the success callback with a FALSE parameter.
      if (this._htOption.error) {
        this._htOption.error.call(this);
      } else if (this._htOption.success) {
        this._htOption.success.call(this, false);
      }
    }
  };

  /**
   * Clear the QRCode
   */
  QRCode.prototype.clear = function () {
    this._oDrawing.clear();
    this._el.title = "";
  };

  /**
   * Check if environment supports image data URIs.
   *
   * WARNING: the first call to this API may invoke async code. Then the answer
   * will be returned through the callback: a `true` or `false` value of the
   * first callback function parameter will tell the caller whether there is
   * (or is NOT) image data URI support in the present environment.
   *
   * When the async test code is invoked, the direct return value is NULL,
   * while otherwise the direct return value is TRUE or FALSE.
   *
   * @return {Boolean} TRUE or FALSE when the async detection logic has
   * already produced a verdict. Otherwise NULL.
   */
  QRCode.prototype.hasImageSupport = function (callback) {
    if (this._oDrawing.hasImageSupport) {
      return this._oDrawing.hasImageSupport(callback);
    }
    return false;
  };

  /**
   * @name QRCode.CorrectLevel
   */
  QRCode.CorrectLevel = QRErrorCorrectLevel;

  // add write method to store qrcode on disk.
  QRCode.prototype.write = function (path) {
    if (typeof fs !== "undefined") {
      fs.writeFile(path, this._oDrawing._elCanvas.toBuffer());
    } else {
      throw new Error(
        "QRCode:write() API not available on this platform: no FS module / filesystem access lib available"
      );
    }
  };

  return QRCode;
});
