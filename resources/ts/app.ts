import '../css/app.css';
import Class from './class';
import * as tensorflow from '@tensorflow/tfjs';
import { ImageClassifier }  from './imageClassifier';
import TinySorter from './tinySorter';

const classWrapper: HTMLElement = document.querySelector('#class-wrapper')!;

const createClassBtn: HTMLButtonElement = document.querySelector('#create-class')!;
const createClassImage: HTMLImageElement = document.querySelector('#create-class-image')!;

const setupEnvBtn: HTMLButtonElement = document.querySelector('#setup-env')!;
const closeEnvSetupBtn: HTMLButtonElement = document.querySelector('#close-env-setup')!;
const setupEnvWrapper: HTMLDivElement = document.querySelector('#setup-env-wrapper')!

const modelInfo: HTMLParagraphElement = document.querySelector('#model-info')!;
const modelCheckbox: HTMLImageElement = document.querySelector('#model-checkbox')!;

const connectArduinoBtn: HTMLButtonElement = document.querySelector('#connect-arduino')!;
const arduinoInfo: HTMLParagraphElement = document.querySelector('#arduino-info')!;
const arduinoCheckbox: HTMLImageElement = document.querySelector('#arduino-checkbox')!;

const envCheckbox: HTMLImageElement = document.querySelector('#env-checkbox')!;

const trainModelBtn: HTMLButtonElement = document.querySelector('#train-model')!;

const startSorter: HTMLButtonElement = document.querySelector('#start-sorting')!;
const stopSorter: HTMLButtonElement = document.querySelector('#stop-sorting')!;

const infoMessage: HTMLDivElement = document.querySelector('#info-message')!;
const infoMessageSender: HTMLSpanElement = document.querySelector('#sender')!;
const infoMessageText: HTMLParagraphElement = document.querySelector('#message')!;

const htmlClassTemplate: HTMLElement = CreateClassTemplate();

const backgroundLayer: HTMLDivElement = document.querySelector('#background-layer')!

const classes: Class[] = [];
const imageClassifier: ImageClassifier = new ImageClassifier();

var arduinoConnected: boolean = false;
var tinySorter: TinySorter | null = null; 

imageClassifier.onModelUpdated = (model: tensorflow.Sequential | null) => OnModelUpdated(model);

classWrapper.addEventListener('onCameraOpen', (e: Event) => CloseOpenCameras((e as CustomEvent).detail));
classWrapper.addEventListener('onClassDelete', (e: Event) => DeleteClass((e as CustomEvent).detail));

createClassBtn.onclick = () => CreateClass();

createClassBtn.onmouseenter = () => createClassImage.src = createClassImage.getAttribute('src-hover')!;  
createClassBtn.onmouseleave = () => createClassImage.src = createClassImage.getAttribute('src-default')!;

connectArduinoBtn.onclick = () => ConnectArduino();

trainModelBtn.onclick = async () => StartTraining();

startSorter.onclick = () => StartSorting();
stopSorter.onclick = () => StopSorting();

setupEnvBtn.onclick = () => OpenEnvSetup();
closeEnvSetupBtn.onclick = () => CloseEnvSetup();

CreateClass();
CreateClass();

const setupEnvClass: Class = new Class('Umgebung', setupEnvWrapper, htmlClassTemplate, true);

classes.push(setupEnvClass);

setupEnvClass.onClassModified = (_class: Class, checkOthers: boolean) => CheckClassModification(setupEnvClass, checkOthers);

function OpenEnvSetup() {
    CloseOpenCameras(null);

    backgroundLayer.classList.remove('hidden');
    setupEnvWrapper.classList.replace('hidden', 'flex');
}

function CloseEnvSetup() {
    CloseOpenCameras(null);

    backgroundLayer.classList.add('hidden');
    setupEnvWrapper.classList.replace('flex', 'hidden');
}

function OnModelUpdated(model: tensorflow.Sequential | null): void {
    if(model == null) {
        startSorter.toggleAttribute('disabled', true);
        modelCheckbox.src = modelCheckbox.getAttribute('src-invalid')!;
        modelInfo.innerText = 'kein Model vorhanden';
    }
    else {
        const classCount: number = Object.keys(imageClassifier.labels).length; 

        if(classCount != 3) {
            startSorter.toggleAttribute('disabled', true);
            modelCheckbox.src = modelCheckbox.getAttribute('src-invalid')!;
        }
        else {
            if(arduinoConnected) {
                startSorter.toggleAttribute('disabled', false);
            }

            modelCheckbox.src = modelCheckbox.getAttribute('src-valid')!;
        }

        modelInfo.innerText = 'trainierte Klassen (' + (classCount - 1) + ')';
    }
}

async function DisplayInfoMessage(sender: string, message: string, messageClass: string | null): Promise<void> {
    infoMessage.classList.add('fading');
    infoMessage.classList.add('flex');
    
    if(messageClass != null) {
        infoMessageText.classList.add(messageClass);
    }

    infoMessageSender.innerText = sender;
    infoMessageText.innerText = message;

    infoMessage.classList.remove('hidden');

    await new Promise(resolve => setTimeout(resolve, 2900));

    infoMessage.classList.add('hidden');

    if(messageClass != null) {
        infoMessageText.classList.remove(messageClass);
    }

    infoMessage.classList.remove('flex');
    infoMessage.classList.remove('fading');
}

async function ConnectArduino(): Promise<void> {
    const connectArduinoText: HTMLSpanElement = document.querySelector('#connect-arduino-text')!
    const connectArduinoIndicator: HTMLSpanElement = document.querySelector('#connect-arduino-indicator')!

    connectArduinoBtn.disabled = true;

    connectArduinoText.classList.add('hidden');
    connectArduinoIndicator.classList.remove('hidden');

    let connected: boolean = await CheckArduinoConnection();

    connectArduinoIndicator.classList.add('hidden');
    connectArduinoText.classList.remove('hidden');

    arduinoConnected = connected;

    if(connected) {
        arduinoInfo.innerText = 'verbunden'
        arduinoCheckbox.src = arduinoCheckbox.getAttribute('src-valid')!;
        
        const classCount: number = Object.keys(imageClassifier.labels).length; 
        
        if(classCount == 3) {
            startSorter.disabled = false;
        }

        DisplayInfoMessage('Arduino', 'Verbindung erfolgreich hergestellt', 'text-green-700');
    }
    else {
        DisplayInfoMessage('Arduino', 'Verbindung konnte nicht hergestellt werden', 'text-red-700');

        connectArduinoBtn.disabled = false;

        return;
    }

    while(connected) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        connected = await CheckArduinoConnection();
    }

    if(tinySorter != null) {
        tinySorter.StopSorting();
    }

    arduinoInfo.innerText = 'nicht verbunden'
    arduinoCheckbox.src = arduinoCheckbox.getAttribute('src-invalid')!;
    arduinoConnected = connected;

    startSorter.toggleAttribute('disabled', true);

    DisplayInfoMessage('Arduino', 'Die Verbindung wurde unterbrochen', 'text-red-700');

    connectArduinoBtn.disabled = false;
}

async function CheckArduinoConnection(): Promise<boolean> {
    try {
        const response: Response = await fetch('http://127.0.0.1:5000/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            const result: any = await response.json();

            return result;
    }
    catch(error: unknown) {
        console.warn(error);
        return false;
    }
}

function StartSorting(): void {
    CloseOpenCameras(null);

    tinySorter = new TinySorter(imageClassifier);

    tinySorter.onConnectionFailure = () => {
        if(tinySorter != null) {
            tinySorter.StopSorting();
        }

        CheckArduinoConnection() 
    };

    tinySorter.Handle();
}

function StopSorting(): void {
    if(tinySorter == null) return;

    tinySorter.StopSorting();
    
    tinySorter = null;
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
    if(!emitter.isEnv) {
        CheckClassSelectable(emitter);
    }
    else {
        if(emitter.selected) {
            envCheckbox.src = envCheckbox.getAttribute('src-valid')!;
        }
        else {
            envCheckbox.src = envCheckbox.getAttribute('src-invalid')!;
        }
    }

    if(modifyOthers) {
        const classesWithouEmitter: Class[] = classes.filter(_class => _class !== emitter); 

        classesWithouEmitter.forEach(_class => {
            if(!_class.isEnv) CheckClassSelectable(_class);
        });
    }

    const selectedClasses: Class[] = classes.filter(_class => _class.selected);

    trainModelBtn.toggleAttribute('disabled', (selectedClasses.length < 3));
}

function CheckClassSelectable(emitter: Class) {
    let emitterSelectable = true;

    if(emitter.images.length == 0) emitterSelectable = false;

    const classesWithouEmitter: Class[] = classes.filter(_class => _class !== emitter);

    classesWithouEmitter.forEach(_class => {
        if(emitter.label == _class.label && (_class.selected || _class.isEnv)) emitterSelectable = false;
    });

    emitter.selectable = emitterSelectable; 
}

function DeleteClass(emitter: Class): void {
    let index: number = classes.indexOf(emitter);
    classes.splice(index, 1);

    if(classes.length <= 3) {
        classes.forEach((_class: Class) => {
            _class.deleteable = false;
        });
    }
    
    CheckClassModification(emitter, true);
}