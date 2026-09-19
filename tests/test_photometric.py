import numpy as np
from cardtruth_core.photometric import photometric_stereo


def test_flat_surface_normal_recovery():
    lights = np.array([
        [0.0, 0.0, 1.0],
        [0.3, 0.0, 0.953939],
        [-0.3, 0.0, 0.953939],
        [0.0, 0.3, 0.953939],
        [0.0, -0.3, 0.953939],
    ])
    lights = lights / np.linalg.norm(lights, axis=1, keepdims=True)
    true_n = np.array([0.0, 0.0, 1.0])
    vals = np.clip(lights @ true_n, 0, 1)

    I = np.tile(vals, (8, 10, 1))
    normals, albedo, residual = photometric_stereo(I, lights)
    mean_n = normals.mean(axis=(0, 1))

    assert mean_n[2] > 0.999
    assert abs(mean_n[0]) < 1e-5
    assert abs(mean_n[1]) < 1e-5
    assert residual.mean() < 1e-8
