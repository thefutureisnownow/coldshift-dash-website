# The PNG icons and the share picture (og.png: the Quiet map, the logo and the name), from the SVG logo and
# src/quiet-map.svg. Needs PySide6 (QtSvg), as the app's desktop tool has:
#   QT_QPA_PLATFORM=offscreen python scripts/brand-icons.py . src/quiet-map.svg
import sys
from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QGuiApplication, QImage, QPainter, QFont
from PySide6.QtSvg import QSvgRenderer
app = QGuiApplication(sys.argv)
R = sys.argv[1]
icon = QSvgRenderer(R + '/public/assets/brand/icon.svg')
logo = QSvgRenderer(R + '/public/assets/brand/logo.svg')
def square(px, bg=None, inset=0.0):
    im = QImage(px, px, QImage.Format_ARGB32); im.fill(QColor(bg) if bg else Qt.transparent)
    p = QPainter(im); p.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform)
    m = px * inset; icon.render(p, QRectF(m, m, px - 2 * m, px - 2 * m)); p.end(); return im
square(192).save(R + '/public/assets/brand/icon-192.png')
square(512).save(R + '/public/assets/brand/icon-512.png')
square(180, '#12161b', 0.04).save(R + '/public/assets/brand/apple-touch-icon.png')
# share picture: the quiet map's charcoal, the logo, the name
W, H = 1200, 630
im = QImage(W, H, QImage.Format_RGB32); im.fill(QColor('#12161b'))
p = QPainter(im); p.setRenderHints(QPainter.Antialiasing | QPainter.SmoothPixmapTransform | QPainter.TextAntialiasing)
art = QSvgRenderer(sys.argv[2]); p.setOpacity(0.5); art.render(p, QRectF(0, 0, W, H))
p.setOpacity(1); lh = 380; lw = lh * 744.71 / 800.63
logo.render(p, QRectF(110, (H - lh) / 2, lw, lh))
f = QFont('Helvetica Neue'); f.setPixelSize(84); f.setWeight(QFont.Bold); p.setFont(f); p.setPen(QColor('#e8eef7'))
p.drawText(QRectF(520, 200, 640, 100), Qt.AlignLeft | Qt.AlignVCenter, 'Coldshift Dash')
f.setPixelSize(34); f.setWeight(QFont.Normal); p.setFont(f); p.setPen(QColor('#93a9c8'))
p.drawText(QRectF(524, 300, 640, 140), Qt.AlignLeft | Qt.TextWordWrap, 'A car dashboard for old and new Android phones: maps, dashcam, music, engine and Convoy.')
p.end(); im.save(R + '/public/assets/brand/og.png')
print('ok')
