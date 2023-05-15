import { ImageClassifier, Prediction } from "./imageClassifier";

export default class TinySorter {
    private imageClassifier: ImageClassifier;

    public onConnectionFailure: () => void = () => {}; 

    private sorterVideo: HTMLVideoElement;

    private isSorting: boolean = false;

    private htmlSortingWrapper: HTMLDivElement;
    private htmlBackgroundLayer: HTMLDivElement;

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

    constructor(imageClassifier: ImageClassifier) {
        this.imageClassifier = imageClassifier;

        this.sorterVideo = document.querySelector('#sorter-video')!;;

        this.htmlSortingWrapper = document.querySelector('#sorting-wrapper')!;
        this.htmlBackgroundLayer = document.querySelector('#background-layer')!;

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
    }

    private async OpenSortingView(): Promise<void> {
        let All_mediaDevices: MediaDevices = navigator.mediaDevices;

        if (!All_mediaDevices || !All_mediaDevices.getUserMedia) {
            console.log('no camera found');
            return;
        }
    
        let stream: MediaStream = await All_mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
    
        this.sorterVideo.srcObject = stream;
    
        this.sorterVideo.onloadedmetadata = () => this.sorterVideo.play();
    
        await new Promise(resolve => setTimeout(resolve, 1000));
    
        this.htmlSortingWrapper.classList.remove('hidden');
        this.htmlBackgroundLayer.classList.remove('hidden');
    
        this.htmlSortingWrapper.classList.add('fixed');
        this.htmlBackgroundLayer.classList.add('fixed');
    }

    private async Wait(milliseconds: number): Promise<void> {
        this.firstClassPredictionValue = 0;
        this.secondClassPredictionValue = 0;

        this.predictionValueDisplay.classList.add('hidden');
        this.waitingIndicatorDisplay.classList.remove('hidden');

        this.predictionLabel = 'Warte auf neues Objekt';

        await new Promise(resolve => setTimeout(resolve, milliseconds));

        this.predictionValueDisplay.classList.remove('hidden');
        this.waitingIndicatorDisplay.classList.add('hidden');
    }

    public async Handle(): Promise<void> {
        await this.OpenSortingView();

        this.isSorting = true;

        while(this.isSorting) {
            const prediction: Prediction | null = await this.MakePrediction(30)

            if(prediction == null) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            if(prediction.result.class == Object.entries(this.imageClassifier.labels)[0][1]) {
                const label: string = Object.entries(this.imageClassifier.labels)[0][1].replace('_', ' ');
                const sucessfull: boolean = await this.SendPredictionToArduino(1, label);
                
                if(!sucessfull) return;

                this.firstClassCounter = this._firstClassCounter + 1;
            }
            
            if(prediction.result.class == Object.entries(this.imageClassifier.labels)[1][1]) {
                const label: string = Object.entries(this.imageClassifier.labels)[1][1].replace('_', ' ');
                const sucessfull: boolean = await this.SendPredictionToArduino(2, label);
                
                if(!sucessfull) return;

                this.secondClassCounter = this._secondClassCounter + 1;
            }

            await this.Wait(5000);
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

            this.predictionValue = prediction.result.percentage;
    
            this.firstClassPredictionValue = prediction.predictions[0].percentage;
            this.secondClassPredictionValue = prediction.predictions[1].percentage

            if(prediction.result.percentage < 75) {
                this.predictionLabel = 'Unbestimmt'

                prediction = null;
            }
            else {
                this.predictionLabel = prediction.result.class.replace('_', ' ');
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return prediction;
    }

    private async SendPredictionToArduino(state: number, class_name: string): Promise<boolean> {
        try {
            this.firstClassPredictionValue = 0;
            this.secondClassPredictionValue = 0;
    
            this.predictionValueDisplay.classList.add('hidden');
            this.waitingIndicatorDisplay.classList.remove('hidden');
    
            this.predictionLabel = 'Warte auf Arduino';

            const response: Response = await fetch('http://127.0.0.1:5000/prediction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ state: state, class_name: class_name })
            });

            const result: any = await response.json();

            if(!result) {
                this.onConnectionFailure();
            }

            this.predictionValueDisplay.classList.remove('hidden');
            this.waitingIndicatorDisplay.classList.add('hidden');

            return result;
        }
        catch(error: unknown) {
            console.warn(error);

            this.onConnectionFailure();
            
            return false;
        }
    }

    public StopSorting(): void {
        this.isSorting = false;
        
        let stream: MediaStream = this.sorterVideo.srcObject as MediaStream;

        if(stream != null) {
            stream.getTracks().forEach(track => track.stop())
        }
    
        this.sorterVideo.pause();
        this.sorterVideo.srcObject = null;
    
        this.htmlSortingWrapper.classList.add('hidden');
        this.htmlBackgroundLayer.classList.add('hidden');
    }
}