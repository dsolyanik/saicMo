var Mosaic = (function () {
    var settings = {
        fileInput: 'file',
        originalImage: 'originalImage',
        mosaic: 'mosaic'
    };

    var isInit = false;

    var fileInput,
        originalImage,
        mosaic;

    function config(config) {
        settings.fileInput = config.fileInput || settings.fileInput;
        settings.originalImage = config.originalImage || settings.originalImage;
        settings.mosaic = config.mosaic || settings.mosaic;
    }

    function init() {
        fileInput = document.getElementById(settings.fileInput);
        originalImage = document.getElementById(settings.originalImage);
        mosaic = document.getElementById(settings.mosaic);
        if (fileInput && originalImage && mosaic) {
            isInit = true;
        } else {
            throw new Error('Please provide config for mosaic module');
        }
    }

    function getFileRef() {
        return new Promise(function (resolve, reject) {
            if (!isInit) {
                init();
            }
            fileInput.onchange = function () {
                fileInput.files[0] ? resolve(fileInput.files[0]) : reject(new Error('Can not retrieve file reference'));
            };
        })
    }

    function prepareFileInput(fn) {
        if (!isInit) {
            init();
        }
        fileInput.onchange = function () {
            clear();
            fn(fileInput.files[0]);
        }
    }
    
    function clear() {
        mosaic.innerHTML = "";
    }

    function readImage(fileRef) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) {
                resolve(e.target)
            };
            reader.readAsDataURL(fileRef);
        });
    }

    function displayImage(src) {
        originalImage.setAttribute('src', src);
    }

    function createImage(src) {
        return new Promise(function (resolve, reject) {
            if (!src) {
                reject(new Error("Please provide image src"))
            }
            var image = new Image();
            image.src = src;
            image.onload = function () {
                resolve(image)
            };
        });
    }

    function cutImage(image) {
        var canvasArray = [];
        var imagePieces = [];
        var width = image.width;
        var height = image.height;
        var tilesInRaw = (image.width - image.width % TILE_WIDTH) / TILE_WIDTH;
        var tilesInColumn = (image.height - image.height % TILE_HEIGHT) / TILE_HEIGHT;

        for (var y = 0; y < tilesInColumn; ++y) {
            for (var x = 0; x < tilesInRaw; ++x) {
                var canvas = document.createElement('canvas');
                canvas.width = TILE_WIDTH;
                canvas.height = TILE_HEIGHT;
                var context = canvas.getContext('2d');
                context.drawImage(image, x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT, 0, 0, canvas.width, canvas.height);
                imagePieces.push(canvas.toDataURL());
                canvasArray.push(canvas);
            }
        }

        return imagePieces;
    }

    function displayMosaic(imagePieces, image) {
        var tilesInRaw = (image.width - image.width % TILE_WIDTH) / TILE_WIDTH;
        var promises = [];
        var matrixPromises = [];
        var mosaic = document.getElementById('mosaic');
        var q = null;
        for (var x = 1; x <= imagePieces.length; ++x) {
            var img = new Image();
            img.src = imagePieces[x - 1];
            var color = getAverageRGB(img);
            var hexColor = rgbToHex(color);

            promises.push(getFromServer(hexColor));

            if (promises.length && promises.length % tilesInRaw == 0) {
                matrixPromises.push(Promise.all(promises));
                promises = [];
            }
        }

        Promise.all(matrixPromises).then(function (promises) {
            promises.forEach(function (items) {
                var row = document.createElement('div');
                row.setAttribute('class', 'row')
                row.setAttribute('style', 'display: flex;')
                items.forEach(function (item) {
                    row.insertAdjacentHTML('beforeend', item);
                });
                mosaic.appendChild(row);
                // mosaic.insertAdjacentHTML('beforeend', '<br>');
            });
        });
    }

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(rgb) {
        var r = rgb.r,
            g = rgb.g,
            b = rgb.b;
        return '' + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function getAverageRGB(imgEl) {
        var blockSize = 5, // only visit every 5 pixels
            defaultRGB = {r: 0, g: 0, b: 0}, // for non-supporting envs
            canvas = document.createElement('canvas'),
            context = canvas.getContext && canvas.getContext('2d'),
            data, width, height,
            i = -4,
            length,
            rgb = {r: 0, g: 0, b: 0},
            count = 0;

        if (!context) {
            debugger;
            return defaultRGB;
        }

        height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
        width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

        context.drawImage(imgEl, 0, 0);

        try {
            data = context.getImageData(0, 0, width, height);
        } catch (e) {
            alert('x');
            return defaultRGB;
        }

        length = data.data.length;

        while ((i += blockSize * 4) < length) {
            ++count;
            rgb.r += data.data[i];
            rgb.g += data.data[i + 1];
            rgb.b += data.data[i + 2];
        }

        // ~~ used to floor values
        rgb.r = ~~(rgb.r / count);
        rgb.g = ~~(rgb.g / count);
        rgb.b = ~~(rgb.b / count);

        return rgb;
    }

    function getFromServer(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/color/' + url, true);

            xhr.onload = function () {
                if (this.status == 200) {
                    resolve(this.response);
                } else {
                    var error = new Error(this.statusText);
                    error.code = this.status;
                    reject(error);
                }
            };

            xhr.onerror = function () {
                reject(new Error("Network Error"));
            };

            xhr.send();
        });
    }

    return {
        /**
         * Config widget.
         * Config an object for defining dom elements for widget.
         * Config an object with following properties:
         * fileInput - file input id,
         * originalImage - div id where original image will be displayed,
         * mosaic - div id where original image will be displayed.
         * @param config
         */
        config: config,
        init: init,
        getFileRef: getFileRef,
        readImage: readImage,
        displayImage: displayImage,
        createImage: createImage,
        cutImage: cutImage,
        displayMosaic: displayMosaic,
        /**
         * @param fn - function that will be execute when file ref will be added on file input
         * with file reference as argument.
         */
        prepareFileInput: prepareFileInput
    };

})();
