import '../css/app.css';

import Class from './class';

const classWrapper: HTMLElement = document.querySelector('#class-wrapper')!;

const createClassBtn: HTMLButtonElement = document.querySelector('#create-class')!;
const createClassImage: HTMLImageElement = document.querySelector('#create-class-image')!;

const trainModelBtn: HTMLButtonElement = document.querySelector('#train-model')!;

const htmlClassTemplate: HTMLElement = CreateClassTemplate();

const classes: Class[] = [];

classWrapper.addEventListener('onCameraOpen', (e: Event) => CloseOpenCameras((e as CustomEvent).detail))
classWrapper.addEventListener('onClassDelete', (e: Event) => DeleteClass((e as CustomEvent).detail))

createClassBtn.onclick = () => CreateClass();

createClassBtn.onmouseenter = () => createClassImage.src = createClassImage.getAttribute('src-hover')!;  
createClassBtn.onmouseleave = () => createClassImage.src = createClassImage.getAttribute('src-default')!;

trainModelBtn.onclick = () => StartTraining();

CreateClass();
CreateClass();

async function StartTraining(): Promise<void> {
    trainModelBtn.disabled = true;

    let btnWidth: number = trainModelBtn.clientWidth;
    
    trainModelBtn.style.width = `${btnWidth}px`;

    trainModelBtn.querySelector('span')?.classList.add('hidden');
    trainModelBtn.querySelector('img')?.classList.remove('hidden');

    const formData: FormData = new FormData();

    classes.forEach(_class => {
        let label: string = _class.label.trim().replaceAll(' ', '');
        let index: number = 0;

        _class.images.forEach(image => {
            index++;
            formData.append('files', image.blob, `${label}_${index}.jpeg`);
        });
    });

    try {
        const response: Response = await fetch('http://127.0.0.1:5000', {
            method: 'POST',    
            body: formData
        });

        const data: any = await response.json();

        console.log(response);
        console.log(data);
    }
    catch(error: unknown) {
        console.log('connection failed');
    }

    trainModelBtn.disabled = false;
    
    trainModelBtn.querySelector('img')?.classList.add('hidden');
    trainModelBtn.querySelector('span')?.classList.remove('hidden');

    trainModelBtn.style.removeProperty('width');
}

function CloseOpenCameras(emitter: Class): void {
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
    let label: string = `Class ${classes.length + 1}`;

    let newClass: Class = new Class(label, classWrapper, htmlClassTemplate);

    classes.push(newClass);
}

function DeleteClass(emitter: Class): void {
    let index: number = classes.indexOf(emitter);
    classes.splice(index, 1);
}