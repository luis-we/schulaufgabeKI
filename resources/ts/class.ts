export default class Class {
    private parentElement: HTMLElement;
    private rootElement: HTMLElement;

    private _images: { url: string, blob: Blob }[];
    
    public get images(): { url: string, blob: Blob }[] { return this._images };

    private classNameInput: HTMLInputElement;

    private openWebcamBtn: HTMLButtonElement;
    private closeWebcamBtn: HTMLButtonElement;
    private captureImageBtn: HTMLButtonElement;
    private deleteClassBtn: HTMLButtonElement;

    private selectClassBtn: HTMLButtonElement;
    private selectClassImage: HTMLImageElement;
    
    private clearClassBtn: HTMLButtonElement;

    private webcamActive: boolean;
    private captureImages: boolean;

    private onCameraOpen: CustomEvent;
    private onClassDelete: CustomEvent;

    private _selected: boolean = false;

    private set clearable(state: boolean) { this.clearClassBtn.disabled = !state };

    public get selected(): boolean { return this._selected };
    
    public set selected(state: boolean) {
        this._selected = state;
        this.SetSelectImage();
    }

    public set selectable(state: boolean) {
        this.selectClassBtn.toggleAttribute('disabled', !state);
        if(!state) this.selected = state;
    }

    public onClassModified: (_class: Class, checkOthers: boolean) => void = () => {};

    public set deleteable(state: boolean) {
        if(state) {
            this.deleteClassBtn.removeAttribute('disabled');
        }
        else {
            this.deleteClassBtn.setAttribute('disabled', '');   
        }
    }

    private _label: string = ''; 

    public get label(): string {
        return this._label.trim();
    }

    private set label(label: string) {
        this._label = label;
        this.classNameInput.value = label;
        this.onClassModified(this, true);
    }

    public get cameraActive(): boolean {
        return this.webcamActive;
    }

    constructor(label: string, parentElement: HTMLElement, htmlTemplate: HTMLElement) {
        this.parentElement = parentElement;
        this.rootElement = htmlTemplate.cloneNode(true) as HTMLElement;
        this.parentElement.append(this.rootElement);
        
        this.classNameInput = this.rootElement.querySelector('[class-label]')!;
        this.classNameInput.oninput = () => this.UpdateLabel();

        this.label = label;
        this._images = [];

        this.webcamActive = false;
        this.captureImages = false;

        this.openWebcamBtn = this.rootElement.querySelector('[enable-webcam]')!;
        this.closeWebcamBtn = this.rootElement.querySelector('[close-webcam]')!
        this.captureImageBtn = this.rootElement.querySelector('[capture-images]')!;
        this.deleteClassBtn = this.rootElement.querySelector('[delete-class]')!;

        this.selectClassBtn = this.rootElement.querySelector('[select-class]')!;
        this.selectClassImage = this.rootElement.querySelector('[select-class-image]')!;

        this.clearClassBtn = this.rootElement.querySelector('[clear-class')!;

        this.openWebcamBtn.onclick = () => this.OpenCamera();
        this.closeWebcamBtn.onclick = () => this.CloseCamera(); 
        this.deleteClassBtn.onclick = () => this.DeleteClass();
        this.selectClassBtn.onclick = () => this.ToggleClass();
        this.clearClassBtn.onclick = () => this.ClearImages();

        this.captureImageBtn.onmouseup = () => this.captureImages = false;
        this.captureImageBtn.onmouseleave = () => this.captureImages = false;

        this.captureImageBtn.onmousedown = () => this.StartCaptureImages();

        this.onCameraOpen = new CustomEvent('onCameraOpen', { detail: this });
        this.onClassDelete = new CustomEvent('onClassDelete', { detail: this });

        this.deleteable = false;
    }

    private UpdateLabel(): void {
        this._label = this.classNameInput.value
        this.onClassModified(this, true);
    }

    private ToggleClass(): void {
        this._selected = !this._selected;

        this.SetSelectImage();

        this.onClassModified(this, true);
    }

    private SetSelectImage() {
        if(this._selected) {
            this.selectClassImage.src = this.selectClassImage.getAttribute('src-checked')!;
        }
        else {
            this.selectClassImage.src = this.selectClassImage.getAttribute('src-empty')!;
        }
    }

    private DeleteClass(): void {
        this.CloseCamera();
        this.parentElement.dispatchEvent(this.onClassDelete);
        this.rootElement.remove();

        this.ClearImages();
    }

    private ClearImages(): void {
        const imageCounterTexts: NodeListOf<HTMLParagraphElement> = this.rootElement.querySelectorAll<HTMLParagraphElement>('[image-counter-text]');

        const wrapperCameraOpen: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-open]')!;
        const wrapperCameraClosed: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-closed]')!;

        imageCounterTexts[0].innerText = 'Bilder aufnehmen:'
        imageCounterTexts[1].innerText = 'Bilder hinzufügen:'

        wrapperCameraOpen.innerHTML = '';
        wrapperCameraClosed.innerHTML = '';

        this._images.forEach(image => URL.revokeObjectURL(image.url));
        this._images = [];

        this.clearable = false;

        this.onClassModified(this, true);
    }

    private async OpenCamera(): Promise<void> {
        let All_mediaDevices: MediaDevices = navigator.mediaDevices;

        if (!All_mediaDevices || !All_mediaDevices.getUserMedia) {
            console.log('no camera found');
            return;
        }

        let stream: MediaStream = await All_mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        let videoElement: HTMLVideoElement = this.rootElement.querySelector('[video]')!;

        videoElement.srcObject = stream;

        videoElement.onloadedmetadata = () => videoElement.play();

        this.OpenCameraView();

        this.webcamActive = true;

        this.parentElement.dispatchEvent(this.onCameraOpen);
    }

    public CloseCamera(): void {
        this.captureImages = false;

        let videoElement: HTMLVideoElement = this.rootElement.querySelector('[video]')!;

        let stream: MediaStream = videoElement.srcObject as MediaStream;

        if(stream != null) {
            stream.getTracks().forEach(track => track.stop())
        }

        videoElement.pause();
        videoElement.srcObject = null;

        this.CloseCameraView();

        this.webcamActive = false;
    }

    private OpenCameraView(): void {
        let webcamWrapper: HTMLDivElement = this.rootElement.querySelector('[webcam-wrapper]')!;
        let actionsWrapper: HTMLDivElement = this.rootElement.querySelector('[actions-wrapper]')!;
        
        let wrapperCameraOpen: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-open]')!;
        let wrapperCameraClosed: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-closed]')!;

        webcamWrapper.classList.remove('hidden');
        actionsWrapper.classList.add('hidden');

        wrapperCameraClosed.parentElement?.classList.remove('flex');
        wrapperCameraClosed.parentElement?.classList.add('hidden');

        wrapperCameraOpen.parentElement?.classList.remove('hidden');
        wrapperCameraOpen.parentElement?.classList.add('flex');
    }

    private CloseCameraView(): void {
        let webcamWrapper: HTMLDivElement = this.rootElement.querySelector('[webcam-wrapper]')!;
        let actionsWrapper: HTMLDivElement = this.rootElement.querySelector('[actions-wrapper]')!;

        let wrapperCameraOpen: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-open]')!;
        let wrapperCameraClosed: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-closed]')!;

        webcamWrapper.classList.add('hidden');
        actionsWrapper.classList.remove('hidden');

        wrapperCameraOpen.parentElement?.classList.remove('flex');
        wrapperCameraOpen.parentElement?.classList.add('hidden');

        wrapperCameraClosed.parentElement?.classList.remove('hidden');
        wrapperCameraClosed.parentElement?.classList.add('flex');
    }

    private async StartCaptureImages(): Promise<void> {
        this.captureImages = true;

        while(this.captureImages && this.webcamActive) {
            this.CaptureImage();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    private CaptureImage(): void {
        let videoElement: HTMLVideoElement = this.rootElement.querySelector('[video]')!;

        let canvasElement: HTMLCanvasElement = document.querySelector('#canvas')!;

        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        let ctx: CanvasRenderingContext2D = canvasElement.getContext('2d')!;
        
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        canvasElement.toBlob(this.CreateImage, "image/jpeg");
    }

    private CreateImage: BlobCallback = (blob: Blob | null) => {
        if(blob == null) return;

        let wrapperCameraOpen: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-open]')!;
        let wrapperCameraClosed: HTMLElement = this.rootElement.querySelector('[image-wrapper-camera-closed]')!;

        let imageElementOpen: HTMLImageElement = document.createElement('img');
        let imageElementClosed: HTMLImageElement = document.createElement('img');

        imageElementOpen.classList.add('h-14', 'mb-2', 'rounded-md', 'bg-gray-700');
        imageElementClosed.classList.add('h-20', 'rounded-md', 'bg-gray-700');

        let url: string = URL.createObjectURL(blob)

        imageElementOpen.src = url;
        imageElementClosed.src = url;

        wrapperCameraOpen.appendChild(imageElementOpen);
        wrapperCameraClosed.appendChild(imageElementClosed);

        this.images.push({ url: url, blob: blob });

        let imageCounterTexts: NodeListOf<HTMLParagraphElement> = this.rootElement.querySelectorAll<HTMLParagraphElement>('[image-counter-text]');

        imageCounterTexts.forEach(textElement => {
            textElement.innerText = `${this.images.length} Bilder hinzugefügt`;
        });

        if(this.images.length > 0) this.clearable = true;

        this.onClassModified(this, false);
    }
}