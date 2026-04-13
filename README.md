# ⚡ Lead / Lag Compensator Visualizer

An interactive **Control Systems Design Tool** that allows you to visualize and tune **Lead and Lag compensators** in real time using Bode plots.

This project is built using **HTML, CSS, and JavaScript (Plotly.js)** and is designed for students, engineers, and enthusiasts working with frequency-domain analysis.

---

## 🚀 Features

* 📊 Real-time **Bode Magnitude & Phase plots**
* 🎛️ Interactive tuning of compensator parameters:

  * Gain factor `a`
  * Time constant `T`
* 🔄 Switch between:

  * 🚀 Lead compensator (phase boost)
  * 🐢 Lag compensator (steady-state improvement)
* 📈 Automatic calculation of:

  * Gain crossover frequency (ωgc)
  * Phase margin (PM)
  * Gain margin (GM)
* 🧮 Custom plant transfer function input
* 🧾 Live display of transfer function
* 📱 Fully responsive modern UI

---

## 🧠 Theory

The compensator used:

* **Lead Compensator:**
  Gc(s) = (1 + aTs) / (1 + Ts), where a > 1

* **Lag Compensator:**
  Gc(s) = (1 + aTs) / (1 + Ts), where a < 1

The system computes:

* Bode magnitude: 20 log₁₀ |G(jω)|
* Phase: ∠G(jω)
* Gain crossover: |G(jω)| = 1
* Phase margin: PM = 180° + ∠G(jωgc)

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS
* **Logic:** Vanilla JavaScript
* **Plotting:** Plotly.js

---

## 📂 Project Structure

```
├── index.html     # UI structure
├── style.css      # Styling & responsiveness
├── script.js      # Core computation & plotting logic
```

---

## ⚙️ How to Run

1. Clone the repository:

```bash
git clone https://github.com/your-username/lead-lag-compensator-visualizer.git
cd lead-lag-compensator-visualizer
```

2. Open `index.html` in your browser.

No build tools or installation required 🚀

---

## 🎯 Usage

1. Enter plant transfer function coefficients:

   * Numerator (e.g., `1000`)
   * Denominator (e.g., `1,22,40,0`)

2. Select compensator type:

   * Lead (a > 1)
   * Lag (a < 1)

3. Adjust:

   * `a` (gain factor)
   * `T` (time constant)

4. Observe:

   * Bode plots updating in real time
   * Phase margin improvement
   * Gain crossover shift

---

## 📸 Preview

* Magnitude & Phase plots update instantly
* Clean dark UI with smooth interaction
* Designed for intuitive learning and experimentation

---

## 🧩 Key Implementation Highlights

* Custom **complex number arithmetic engine**
* Polynomial evaluation for transfer functions
* Logarithmic frequency sweep (logspace)
* Phase unwrapping to avoid discontinuities
* Numerical interpolation for accurate margin calculation

---

## 💡 Future Improvements

* Nyquist plot support
* Root locus visualization
* Automatic compensator design (given target PM)
* Export plots as images
* Save/load configurations

---

## 🤝 Contributing

Feel free to fork the repo and submit pull requests!

---

## 📜 License

MIT License

---

## 👨‍💻 Author

**Anish**
Electronics & Telecommunication Engineering
Jadavpur University
