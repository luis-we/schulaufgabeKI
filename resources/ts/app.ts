import '../css/app.css';
import Class from './class';
import * as tensorflow from '@tensorflow/tfjs';
import { ImageClassifier }  from './imageClassifier';
import TinySorter from './tinySorter';

const classWrapper: HTMLElement = document.querySelector('#class-wrapper')!;

const createClassBtn: HTMLButtonElement = document.querySelector('#create-class')!;
const createClassImage: HTMLImageElement = document.querySelector('#create-class-image')!;

const modelInfo: HTMLParagraphElement = document.querySelector('#model-info')!;
const modelCheckbox: HTMLImageElement = document.querySelector('#model-checkbox')!;

const arduinoInfo: HTMLParagraphElement = document.querySelector('#arduino-info')!;
const arduinoCheckbox: HTMLImageElement = document.querySelector('#arduino-checkbox')!;

const trainModelBtn: HTMLButtonElement = document.querySelector('#train-model')!;

const startSorter: HTMLButtonElement = document.querySelector('#start-sorting')!;
const stopSorter: HTMLButtonElement = document.querySelector('#stop-sorting')!;

const sorterVideo: HTMLVideoElement = document.querySelector('#sorter-video')!;
const predictionVideo: HTMLVideoElement = document.querySelector('#sorter-video')!;

const htmlBackgroundLayer: HTMLElement = document.querySelector('#background-layer')!;
const htmlSortingWrapper: HTMLElement = document.querySelector('#sorting-wrapper')!;

const htmlClassTemplate: HTMLElement = CreateClassTemplate();

const classes: Class[] = [];
const imageClassifier: ImageClassifier = new ImageClassifier();

var isPredicting = false;

var tinySorter: TinySorter | null = null; 

imageClassifier.onModelUpdated = (model: tensorflow.Sequential | null) => OnModelUpdated(model);

classWrapper.addEventListener('onCameraOpen', (e: Event) => CloseOpenCameras((e as CustomEvent).detail));
classWrapper.addEventListener('onClassDelete', (e: Event) => DeleteClass((e as CustomEvent).detail));

createClassBtn.onclick = () => CreateClass();

createClassBtn.onmouseenter = () => createClassImage.src = createClassImage.getAttribute('src-hover')!;  
createClassBtn.onmouseleave = () => createClassImage.src = createClassImage.getAttribute('src-default')!;

trainModelBtn.onclick = async () => StartTraining();

startSorter.onclick = async () => StartSorting();
stopSorter.onclick = () => StopSorting();

CreateClass();
CreateClass();

function OnModelUpdated(model: tensorflow.Sequential | null): void {
    if(model == null) {
        startSorter.setAttribute('disabled', '');
        modelCheckbox.src = modelCheckbox.getAttribute('src-invalid')!;
        modelInfo.innerText = 'kein Model vorhanden';
    }
    else {
        const classCount: number = Object.keys(imageClassifier.labels).length; 

        if(classCount != 2) {
            startSorter.setAttribute('disabled', '');
            modelCheckbox.src = modelCheckbox.getAttribute('src-invalid')!;
        }
        else {
            startSorter.removeAttribute('disabled');
            modelCheckbox.src = modelCheckbox.getAttribute('src-valid')!;
        }

        modelInfo.innerText = 'trainierte Klassen (' + classCount + ')';
    }
}

async function StartSorting(): Promise<void> {
    CloseOpenCameras(null);

    let All_mediaDevices: MediaDevices = navigator.mediaDevices;

    if (!All_mediaDevices || !All_mediaDevices.getUserMedia) {
        console.log('no camera found');
        return;
    }

    let stream: MediaStream = await All_mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    sorterVideo.srcObject = stream;

    sorterVideo.onloadedmetadata = () => sorterVideo.play();

    await new Promise(resolve => setTimeout(resolve, 1000));

    htmlSortingWrapper.classList.remove('hidden');
    htmlBackgroundLayer.classList.remove('hidden');

    htmlSortingWrapper.classList.add('fixed');
    htmlBackgroundLayer.classList.add('fixed');

    tinySorter = new TinySorter(imageClassifier, sorterVideo);
}

function StopSorting(): void {
    if(tinySorter == null) return;

    tinySorter.StopSorting();
    
    tinySorter = null;

    let stream: MediaStream = sorterVideo.srcObject as MediaStream;

    if(stream != null) {
        stream.getTracks().forEach(track => track.stop())
    }

    sorterVideo.pause();
    sorterVideo.srcObject = null;

    htmlSortingWrapper.classList.add('hidden');
    htmlBackgroundLayer.classList.add('hidden');
}

async function StartTraining(): Promise<void> {
    trainModelBtn.disabled = true;
    startSorter.disabled = true;

    let btnWidth: number = trainModelBtn.clientWidth;
    
    trainModelBtn.style.width = `${btnWidth}px`;

    trainModelBtn.querySelector('span')?.classList.add('hidden');
    trainModelBtn.querySelector('img')?.classList.remove('hidden');

    const selectedClasses: Class[] = classes.filter(_class => _class.selected);

    await imageClassifier.TrainModel(selectedClasses);

    trainModelBtn.disabled = false;

    trainModelBtn.querySelector('img')?.classList.add('hidden');
    trainModelBtn.querySelector('span')?.classList.remove('hidden');

    trainModelBtn.style.removeProperty('width');
}

function CloseOpenCameras(emitter: Class | null): void {
    classes.forEach(_class => {
        if(!_class.cameraActive) return;
        if(_class == emitter) return;
        _class.CloseCamera();
    })
}

function CreateClassTemplate(): HTMLElement {
    let originalClassTemplate: HTMLElement = document.querySelector('#class-template')!;
    let htmlClassTemplate: HTMLElement = originalClassTemplate.cloneNode(true) as HTMLElement;
    
    originalClassTemplate.remove();
    htmlClassTemplate.removeAttribute('id');

    return htmlClassTemplate;
}

function CreateClass(): void {
    let label: string = `Klasse ${classes.length + 1}`;

    let newClass: Class = new Class(label, classWrapper, htmlClassTemplate);

    classes.push(newClass);

    if(classes.length > 2) {
        classes.forEach((_class: Class) => {
            _class.deleteable = true;
        });
    }

    newClass.onClassModified = (_class: Class, checkOthers: boolean) => CheckClassModification(_class, checkOthers);

    CheckClassModification(newClass, false);
}

function CheckClassModification(emitter: Class, modifyOthers: boolean): void {
    CheckClassSelectable(emitter);

    if(modifyOthers) {
        const classesWithouEmitter: Class[] = classes.filter(_class => _class !== emitter); 

        classesWithouEmitter.forEach(_class => {
            CheckClassSelectable(_class);
        });
    }

    const selectedClasses: Class[] = classes.filter(_class => _class.selected);

    trainModelBtn.toggleAttribute('disabled', (selectedClasses.length < 2));
}

function CheckClassSelectable(emitter: Class) {
    let emitterSelectable = true;

    if(emitter.images.length == 0) emitterSelectable = false;

    const classesWithouEmitter: Class[] = classes.filter(_class => _class !== emitter);

    classesWithouEmitter.forEach(_class => {
        if(emitter.label == _class.label && _class.selected) emitterSelectable = false;
    });

    emitter.selectable = emitterSelectable; 
}

function DeleteClass(emitter: Class): void {
    let index: number = classes.indexOf(emitter);
    classes.splice(index, 1);

    if(classes.length <= 2) {
        classes.forEach((_class: Class) => {
            _class.deleteable = false;
        });
    }
    
    CheckClassModification(emitter, true);
}