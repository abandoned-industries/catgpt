// Cut the foreground subject out of an image using Vision, writing a PNG
// with a real alpha channel. Used for icon source prep when only a
// background-baked raster is available.
//
//   xcrun swift scripts/subject-lift.swift <input> <output.png>

import AppKit
import CoreImage
import Vision

guard CommandLine.arguments.count == 3 else {
  FileHandle.standardError.write(Data("usage: subject-lift <input> <output.png>\n".utf8))
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let ciImage = CIImage(contentsOf: inputURL) else {
  FileHandle.standardError.write(Data("error: cannot load \(inputURL.path)\n".utf8))
  exit(1)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: ciImage)

do {
  try handler.perform([request])
} catch {
  FileHandle.standardError.write(Data("error: Vision request failed: \(error)\n".utf8))
  exit(1)
}

guard let observation = request.results?.first else {
  FileHandle.standardError.write(Data("error: no foreground subject found\n".utf8))
  exit(1)
}

do {
  let masked = try observation.generateMaskedImage(
    ofInstances: observation.allInstances,
    from: handler,
    croppedToInstancesExtent: false
  )
  let outputImage = CIImage(cvPixelBuffer: masked)
  let context = CIContext()
  guard let srgb = CGColorSpace(name: CGColorSpace.sRGB) else { exit(1) }
  try context.writePNGRepresentation(
    of: outputImage,
    to: outputURL,
    format: .RGBA8,
    colorSpace: srgb
  )
  print("subject written: \(outputURL.path)")
} catch {
  FileHandle.standardError.write(Data("error: mask/write failed: \(error)\n".utf8))
  exit(1)
}
