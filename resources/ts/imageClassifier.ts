import * as tensorflow from '@tensorflow/tfjs';
import Class from './class';

export class ImageClassifier {
    private _model: tensorflow.Sequential | null = null;
    private _labels: { [id: number] : string } = {};

    public get model(): tensorflow.Sequential | null { return this._model };
    public get labels(): { [id: number] : string } { return this._labels };

    public onModelUpdated: (model: tensorflow.Sequential | null) => void = () => {};

    private set model(model: tensorflow.Sequential | null) { 
        this._model = model 
        this.onModelUpdated(model);
    }

    constructor() {
        tensorflow.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
    }

    public PredictSample(displayElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData | ImageBitmap): Prediction | null {
        if(this.model == null) {
            console.warn('No Model available');
            return null;
        }

        let imageTensor: tensorflow.Tensor3D = tensorflow.browser.fromPixels(displayElement);

        imageTensor = imageTensor.resizeNearestNeighbor([120, 160]);
        imageTensor = imageTensor.div(255.0);
        imageTensor = imageTensor.expandDims(0);
        imageTensor = imageTensor.cast("float32");

        const prediction: any = this.model.predict(imageTensor);
        const result: tensorflow.DataTypeMap[tensorflow.NumericDataType] =  prediction.dataSync();

        const max_value = Math.max(...result);
        const max_index = result.findIndex((value, index, obj) => value == max_value);

        let predictions: { percentage: number, class: string}[] = [];

        for(let entry of result.entries()) {
            predictions.push({
                percentage: entry[1] * 100,
                class: this.labels[entry[0]]
            });
        }

        return {
            result: {
                percentage: max_value * 100,  
                class: this.labels[max_index]
            },

            predictions: predictions
        }
    }

    public async TrainModel(classes: Class[]): Promise<void> {
        try {
            const preparedData: { 
                labels: { [id: number] : string; }, 
                trainingData: { labels: number[], images: tensorflow.Tensor3D[] }
            } = this.PrepareData(classes);
    
            const model: tensorflow.Sequential = this.CreateModel(classes.length);

            tensorflow.util.shuffleCombo(preparedData.trainingData.labels, preparedData.trainingData.images);

            const trainLabels = tensorflow.oneHot(preparedData.trainingData.labels, classes.length);
            const trainImages = tensorflow.concat(preparedData.trainingData.images);

            await model.fit(trainImages, trainLabels, { epochs: 3, batchSize: 1 });
    
            this._labels = preparedData.labels;
            this.model = model;
        }
        catch(error: unknown) {
            console.warn(error);
        }
    }

    private PrepareData(classes: Class[]): { labels: { [id: number] : string; }, trainingData: { labels: number[], images: tensorflow.Tensor3D[] }} {
        let labels: { [id: number] : string; } = {};    
            
        let index: number = 0;

        let labelData: number[] = [];  
        let imageData: tensorflow.Tensor3D[] = [];

        classes.forEach(_class => {
            let label: string = _class.label.trim().replaceAll(' ', '_');
            
            labels[index] = label;

            _class.images.forEach(image => {
                let imageElement: HTMLImageElement = new Image(160, 120);
                imageElement.src = image.url;

                let imageTensor: tensorflow.Tensor3D = tensorflow.browser.fromPixels(imageElement);
                
                imageTensor = imageTensor.div(255.0);
                imageTensor = imageTensor.expandDims(0);
                imageTensor = imageTensor.cast("float32");

                labelData.push(index);
                imageData.push(imageTensor);
            });

            index++;
        });

        return { labels: labels, trainingData: { labels: labelData, images: imageData }};
    }

    private CreateModel(classCount: number): tensorflow.Sequential {
        const model: tensorflow.Sequential = tensorflow.sequential();

        const lossFunction = classCount > 2 ? 'categoricalCrossentropy' : 'binaryCrossentropy'

        model.add(tensorflow.layers.conv2d({
            inputShape: [120, 160, 3],
            filters: 4,
            kernelSize: [3, 3],
            activation: 'relu',
        }));

        model.add(tensorflow.layers.conv2d({
            filters: 8,
            kernelSize: [3, 3],
            activation: 'relu',
        }));

        model.add(tensorflow.layers.maxPooling2d({ poolSize: [2, 2] }));
        model.add(tensorflow.layers.dropout({ rate: 0.3 }));
        
        model.add(tensorflow.layers.flatten());

        model.add(tensorflow.layers.dense({ units: 128, activation: 'relu' }));
        model.add(tensorflow.layers.dropout({ rate: 0.3} ));
        model.add(tensorflow.layers.dense({ units: classCount, activation: 'softmax' }));

        const optimizer = tensorflow.train.adam(0.0001);

        model.compile({
            optimizer: optimizer,
            loss: lossFunction,
            metrics: ['accuracy'],
        });

        return model;
    }
}

export interface Prediction {
    result: { percentage: number, class: string },
    predictions: { percentage: number, class: string}[]
}