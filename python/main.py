from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import serial
import asyncio

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
    class_name: str


ser = serial.Serial('COM4', 9600)

ser.write(b'3')

@app.post("/prediction")
async def controllServo(data: Data):
    connectionSuccess = await checkConnection()
    
    if(connectionSuccess):
        if data.state == 1:
            ser.write(b'1')
            ser.write(data.class_name.encode())

        elif data.state == 2:
            ser.write(b'2')
            ser.write(data.class_name.encode())

        await asyncio.sleep(3)

        ser.write(b'3')

    return connectionSuccess
    

@app.post("/connect")
async def checkConnection():
    if ser.isOpen():
        return True
    else:
        return False