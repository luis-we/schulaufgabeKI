from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel
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

class Data(BaseModel):
    state: int
    
@app.post("/prediction")
async def controllServo(data: Data):
    print(data)
    
@app.post("/connect")
async def checkConnection():
    return True