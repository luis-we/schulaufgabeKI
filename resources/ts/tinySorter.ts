import { ImageClassifier, Prediction } from "./imageClassifier";

export default class TinySorter {
    private imageClassifier: ImageClassifier;

    private sorterVideo: HTMLVideoElement;

    private isSorting: boolean = false;

    private firstClassLabelDisplay: HTMLHeadingElement;
    private secondClassLabelDisplay: HTMLHeadingElement;

    private firstClassCounterDisplay: HTMLSpanElement;
    private secondClassCounterDisplay: HTMLSpanElement;

    private _firstClassCounter: number = 0;
    private _secondClassCounter: number = 0;

    private firstClassPredictionValueDisplay: HTMLHRElement;
    private secondClassPredictionValueDisplay: HTMLHRElement;

    private predictionLabelDisplay: HTMLSpanElement;
    private predictionValueDisplay: HTMLSpanElement;

    private waitingIndicatorDisplay: HTMLImageElement;

    private set firstClassLabel(value: string) {
        this.firstClassLabelDisplay.innerText = value;
    }

    private set secondClassLabel(value: string) {
        this.secondClassLabelDisplay.innerText = value;
    }

    private set firstClassCounter(value: number) {
        this._firstClassCounter = value;
        this.firstClassCounterDisplay.innerText = this._firstClassCounter.toString();
    }

    private set secondClassCounter(value: number) {
        this._secondClassCounter = value;
        this.secondClassCounterDisplay.innerText = this._secondClassCounter.toString();
    }

    private set predictionLabel(label: string) {
        this.predictionLabelDisplay.innerText = label;
    }

    private set predictionValue(value: number) {
        this.predictionValueDisplay.innerText = Math.round(value).toString() + '%';
    }

    private set firstClassPredictionValue(value: number) {
        this.firstClassPredictionValueDisplay.style.width = value.toString() + '%';
    }

    private set secondClassPredictionValue(value: number) {
        this.secondClassPredictionValueDisplay.style.width = value.toString() + '%';
    }

    constructor(imageClassifier: ImageClassifier, sorterVideo: HTMLVideoElement) {
        this.imageClassifier = imageClassifier;

        this.sorterVideo = sorterVideo;

        this.firstClassLabelDisplay = document.querySelector('#first-class-label')!;
        this.secondClassLabelDisplay = document.querySelector('#second-class-label')!;

        this.firstClassCounterDisplay = document.querySelector('#first-class-counter')!;
        this.secondClassCounterDisplay = document.querySelector('#second-class-counter')!;

        this.firstClassPredictionValueDisplay = document.querySelector('#first-class-prediction-value')!;
        this.secondClassPredictionValueDisplay = document.querySelector('#second-class-prediction-value')!;

        this.predictionLabelDisplay = document.querySelector('#prediction-label')!;
        this.predictionValueDisplay = document.querySelector('#prediction-value')!;

        this.waitingIndicatorDisplay = document.querySelector('#prediction-waiting-indicator')!;

        this.firstClassCounter = 0;
        this.secondClassCounter = 0;

        this.firstClassLabel = Object.entries(imageClassifier.labels)[0][1].replace('_', ' ');
        this.secondClassLabel = Object.entries(imageClassifier.labels)[1][1].replace('_', ' ');

        this.predictionLabel = 'Unbestimmt'
        this.predictionValue = 0;

        this.Handle();
    }

    private async Wait(milliseconds: number): Promise<void> {
        this.firstClassPredictionValue = 0;
        this.secondClassPredictionValue = 0;

        this.predictionValueDisplay.classList.add('hidden');
        this.waitingIndicatorDisplay.classList.remove('hidden');

        this.predictionLabel = 'Warte auf Arduino';

        await new Promise(resolve => setTimeout(resolve, milliseconds));

        this.predictionValueDisplay.classList.remove('hidden');
        this.waitingIndicatorDisplay.classList.add('hidden');
    }

    public async Handle(): Promise<void> {
        this.isSorting = true;

        while(this.isSorting) {
            const prediction: Prediction | null = await this.MakePrediction(30)

            if(prediction == null) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            if(prediction.result.class == Object.entries(this.imageClassifier.labels)[0][1]) {
                this.firstClassCounter = this._firstClassCounter + 1;
            }
            
            if(prediction.result.class == Object.entries(this.imageClassifier.labels)[1][1]) {
                this.secondClassCounter = this._secondClassCounter + 1;
            }

            await this.Wait(3000);
        }
    }

    private async MakePrediction(iterations: number): Promise<Prediction | null> {
        let prediction: Prediction | null = null;

        for(let iterationCount: number = 0; iterationCount < iterations; iterationCount++) {
            prediction = this.imageClassifier.PredictSample(this.sorterVideo);

            if(prediction == null) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            if(prediction.result.percentage < 50) {
                this.predictionLabel = 'Unbestimmt'
                prediction = null;
                
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            this.predictionLabel = prediction.result.class.replace('_', ' ');
            this.predictionValue = prediction.result.percentage;
    
            this.firstClassPredictionValue = prediction.predictions[0].percentage;
            this.secondClassPredictionValue = prediction.predictions[1].percentage
    
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return prediction;
    }

    public StopSorting(): void {
        this.isSorting = false;
    }
}