from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt



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
    class_names = []
    images_original = []
    images_small = []
    
    for file in files:
        label = file.filename.split("_")[0]

        if label not in class_names:
            class_names.append(label)
        
       
    return {"filenames": [file.filename for file in files]}
    