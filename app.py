from flask import Flask, redirect

app = Flask(__name__)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return redirect('https://1antiq.in', code=302)

if __name__ == '__main__':
    app.run(debug=True)
