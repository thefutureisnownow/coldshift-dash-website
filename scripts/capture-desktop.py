"""The desktop companion's pages as pictures for the site: opens its window (no vehicle picker), shows each page,
saves it at 2x, then quits. Run it with the desktop app's Python, from its folder, against a demo setup (see the
README's "Desktop screenshots"), never your own settings:

    HOME=... DASHSYNC_CONFIG=... DASHSYNC_CACHE=... PATH=/usr/bin:/bin PYTHONPATH=. \
        .venv/bin/python <this file> OUT_DIR Overview Maps Music Look
"""
import os, sys
from PySide6.QtCore import QTimer, QThreadPool
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QIcon, QPixmap
from dashsync.gui import __main__ as m, theme

out = sys.argv[1]
want = sys.argv[2:] or ["Overview", "Phone", "Maps", "Music", "Voices", "Look", "Recordings", "Track", "Log book", "Convoy"]
app = QApplication(sys.argv[:1])
app.setApplicationName("coldshift.dash-screens")
app.setOrganizationName("scratch")
theme.apply()
w = m.Window()
w.resize(1240, 800)
w.show()
queue = list(want)
HEIGHTS = {"Overview": 660, "Maps": 660, "Music": 660}

def step():
    if not queue:
        QThreadPool.globalInstance().waitForDone(5000)
        os._exit(0)
    title = queue[0]
    w.resize(1240, HEIGHTS.get(title, 800))
    w.go(title)
    QTimer.singleShot(int(os.environ.get("WAIT", "2500")), lambda: shoot(title))

def shoot(title):
    queue.pop(0)
    pix = QPixmap(w.size() * 2)
    pix.setDevicePixelRatio(2)
    w.render(pix)
    pix.save(os.path.join(out, title.lower().replace(" ", "-") + ".png"))
    print("saved", title, flush=True)
    step()

QTimer.singleShot(1500, step)
app.exec()
