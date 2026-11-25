from pathlib import Path

import cv2
import numpy as np


CASCADE_PATH = (
    Path(__file__).resolve().parent.parent / "haarcascade_russian_plate_number.xml"
)
plate_cascade = cv2.CascadeClassifier(str(CASCADE_PATH))

if plate_cascade.empty():
    raise RuntimeError(f"Could not load license plate cascade: {CASCADE_PATH}")


def blur_license_plates(image: np.ndarray) -> tuple[np.ndarray, int]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    plates = plate_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
    )

    for x, y, width, height in plates:
        region = image[y : y + height, x : x + width]
        image[y : y + height, x : x + width] = cv2.GaussianBlur(
            region, (51, 51), 30
        )

    return image, len(plates)


def process_image(image_bytes: bytes) -> tuple[bytes, int]:
    file_bytes = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("The uploaded file is not a supported image.")

    if image.shape[0] * image.shape[1] > 25_000_000:
        raise ValueError("The image must be 25 megapixels or smaller.")

    image, plate_count = blur_license_plates(image)
    success, encoded = cv2.imencode(".jpg", image)
    if not success:
        raise ValueError("The image could not be processed.")

    return encoded.tobytes(), plate_count
