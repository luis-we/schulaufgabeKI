from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
import cv2
import json

app = FastAPI()

origins = [
    "http://localhost:3333",
    "http://127.0.0.1:3333",
    "http://localhost:8080"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/")
async def create_files(files: list[UploadFile] = File(...)):
    class_names = {}
    
    train_labels = []
    train_images = []
    
    index = 0

    for file in files:
        class_name = file.filename.split("_")[0]

        if class_name not in class_names:
            class_names[class_name] = index
            index += 1

    for file in files:
        class_name = file.filename.split("_")[0]

        fileContent = await file.read()
        imageArray = np.fromstring(fileContent, np.uint8)
        
        image = cv2.imdecode(imageArray, cv2.IMREAD_COLOR)

        train_images.append(image)
        train_labels.append(class_names[class_name])

    train_images = np.array(train_images, dtype='float32')
    train_labels = np.array(train_labels, dtype='int32')

    model = tf.keras.Sequential([
        tf.keras.layers.Flatten(input_shape=(480, 640, 3)),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dense(10)
    ])

    model.compile(optimizer='adam', loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True), metrics=['accuracy'])
    
    model.fit(train_images, train_labels, epochs=10)

    model_content = model.to_json()

    return {
        'model': model_content,
        'labels': class_names
    }
    