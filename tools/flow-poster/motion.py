"""The stand-in films shot by motion.cjs, encoded for the site (site/assets/flow/motion-wide.mp4, motion-square.mp4).
H.264 (the graphics card's decoder plays it everywhere, next to nothing for the page), 60 frames a second like the live
scene, BT.709 limited range (the still's white stays white), the index at the front (it plays while it downloads).
The wide film is 1920x1080 (level 4.2: every hardware decoder takes it), from the 2232x1256 frames; the square one keeps
its 1050x1050.
    python3 tools/flow-poster/motion.py <frames dir>"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'site', 'assets', 'flow')
FRAMES = sys.argv[1]
for name, size in (('wide', '1920:1080'), ('square', '1050:1050')):
    out = os.path.join(OUT, 'motion-%s.mp4' % name)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-framerate', '60', '-i', os.path.join(FRAMES, name, '%04d.png'),
        '-vf', 'scale=%s:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p' % size,
        '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '24', '-profile:v', 'high', '-level', '4.2',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', '-an', out,
    ], check=True)
    print(name, os.path.getsize(out))
