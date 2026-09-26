# Megvii YOLOX-Nano ONNX Model Assets

This directory hosts the exported YOLOX-Nano ONNX model weights (`yolox_nano.onnx`).

### License
- Megvii YOLOX is released under the **Apache License 2.0**.
- Fully compliant for commercial production applications (unlike Ultralytics AGPL-3.0 models).

### How to Bundle the Model File:
1. Download or export the pretrained `yolox_nano.onnx` (Input: 416x416 RGB, Classes: 80 COCO).
2. Place `yolox_nano.onnx` into this folder:
   `assets/models/yolox_nano.onnx`
3. For Android standalone builds, ensure it is copied to `android/app/src/main/assets/models/yolox_nano.onnx`.
4. For iOS builds, ensure the file is added to the Xcode project bundle resources.
