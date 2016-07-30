(function () {

    document.addEventListener("DOMContentLoaded", mainController);

    function mainController() {
        Mosaic.config({
            fileInput: 'file',
            originalImage: 'originalImage',
            mosaic: 'mosaic'
        });

        Mosaic.prepareFileInput(onAddImage);

        function onAddImage(fileRef) {
            Mosaic.readImage(fileRef)
                .then(function (fileReader) {
                    Mosaic.displayImage(fileReader.result);

                    return Mosaic.createImage(fileReader.result);
                })
                .then(function (image) {
                    var imagePieces = Mosaic.cutImage(image);

                    Mosaic.displayMosaic(imagePieces, image);
                })
                .catch(function (error) {
                    alert('Sorry, something went wrong: ' + error);
                });
        }
    }
})();
