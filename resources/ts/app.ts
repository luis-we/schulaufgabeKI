import '../css/app.css'

OpenCamera();

async function OpenCamera(): Promise<void> {
    let All_mediaDevices: MediaDevices = navigator.mediaDevices;

    if (!All_mediaDevices || !All_mediaDevices.getUserMedia) {
        console.log('no camera found');
        return;
    }

    let stream: MediaStream = await All_mediaDevices.getUserMedia({
        audio: true,
        video: true
    });

    let videoElement: HTMLVideoElement = document.querySelector('video')!;

    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => videoElement.play();
}