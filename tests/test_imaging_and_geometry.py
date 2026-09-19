from io import BytesIO
import numpy as np
import pytest
from PIL import Image
from cardtruth_core.imaging import decode_image
from cardtruth_core.photometric import integrate_normals_fft, photometric_stereo, detrend_plane


def test_exif_orientation_is_applied_before_measurement():
    source = Image.new('RGB', (120, 80), 'white')
    exif = Image.Exif(); exif[274] = 6
    buffer = BytesIO(); source.save(buffer, format='JPEG', exif=exif)
    image, metadata = decode_image(buffer.getvalue())
    assert metadata['encoded_dimensions'] == [120, 80]
    assert metadata['decoded_source_dimensions'] == [80, 120]
    assert image.shape[:2] == (120, 80)


def test_transparent_pixels_are_composited_not_treated_as_white_damage():
    source = Image.new('RGBA', (100, 100), (255, 255, 255, 0))
    buffer = BytesIO(); source.save(buffer, format='PNG')
    image, _ = decode_image(buffer.getvalue())
    assert image[0, 0].tolist() == [35, 27, 22]  # BGR matte background.


def test_animation_is_rejected():
    a = Image.new('RGB', (100, 100), 'white'); b = Image.new('RGB', (100, 100), 'black')
    buffer = BytesIO(); a.save(buffer, format='PNG', save_all=True, append_images=[b], duration=100, loop=0)
    with pytest.raises(ValueError, match='Animated'):
        decode_image(buffer.getvalue())


def test_no_physical_detail_is_created_by_small_image_decode():
    source = Image.new('RGB', (300, 400), 'white'); buffer = BytesIO(); source.save(buffer, format='PNG')
    image, metadata = decode_image(buffer.getvalue())
    assert metadata['analysis_dimensions'] == [300, 400]
    assert image.shape[:2] == (400, 300)


def test_fft_reconstructs_known_periodic_relative_surface():
    h, w = 32, 40
    y, x = np.indices((h, w))
    z = .3 * np.sin(2*np.pi*x/w) + .2 * np.cos(2*np.pi*y/h)
    p = .3 * (2*np.pi/w) * np.cos(2*np.pi*x/w)
    q = -.2 * (2*np.pi/h) * np.sin(2*np.pi*y/h)
    normals = np.stack([-p, -q, np.ones_like(p)], axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    result = integrate_normals_fft(normals)
    np.testing.assert_allclose(result, z - np.median(z), atol=1e-10)


def test_zero_albedo_is_unknown_not_a_confident_flat_surface():
    lights = np.array([[0, 0, 1], [.4, 0, 1], [0, .4, 1], [-.4, -.4, 1]])
    normals, albedo, residual = photometric_stereo(np.zeros((4, 5, 4)), lights)
    assert np.isnan(normals).all() and np.isnan(albedo).all() and np.isnan(residual).all()


def test_plane_detrending_removes_only_a_known_plane():
    y, x = np.indices((15, 20)); z = 1.3*x + .4*y + 6
    np.testing.assert_allclose(detrend_plane(z), np.zeros_like(z), atol=1e-10)
