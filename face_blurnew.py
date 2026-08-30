import cv2
import numpy as np

# PAKAI FILE YANG SUDAH DIDOWNLOAD
face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 480)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Bikin mask (area wajah bakal ditandain)
    mask = np.zeros(frame.shape[:2], dtype=np.uint8)
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    for (x, y, w, h) in faces:
        # Tandain area wajah di mask (warna putih)
        mask[y:y+h, x:x+w] = 255

    # ======== SETTING BLUR (1 ANGKA) ========
    blur = 30      # <== GANTI ANGKA INI (5, 15, 25, 35, 55)
    # =========================================

    if blur % 2 == 0:
        blur += 1

    # Blur seluruh frame
    blurred = cv2.GaussianBlur(frame, (blur, blur), blur)

    # Ambil background aja yang blur (area selain wajah)
    mask_inv = cv2.bitwise_not(mask)
    background = cv2.bitwise_and(blurred, blurred, mask=mask_inv)
    
    # Ambil area wajah yang tetap jelas (gak ke-blur)
    face_clear = cv2.bitwise_and(frame, frame, mask=mask)

    # Gabungin background blur + wajah jelas
    result = cv2.add(background, face_clear)

    cv2.imshow("Background Blur", result)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()