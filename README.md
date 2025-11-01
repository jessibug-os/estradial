# 💉 EstraDial

> A friendly pharmacokinetic calculator for visualizing estradiol ester concentrations over time ✨

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://jessibug-os.github.io/EstraDial)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

## 🌸 What is this?

EstraDial helps you calculate and visualize how estradiol concentration changes in your body over time based on your injection schedule. It uses real pharmacokinetic models to show you what's happening between doses!

### ✨ Features

- 📊 **Interactive Graph** - See your estradiol levels over time with a beautiful chart
- 📅 **Visual Calendar** - Click-to-add injection scheduling (so much better than typing!)
- 💊 **7 Different Esters** - Choose from valerate, cypionate, enanthate, and more
- 🔄 **Schedule Repetition** - Automatically repeat your cycle to see steady-state levels
- 🌊 **Reference Cycle** - Compare against cis women's natural menstrual cycle
- 🎨 **Per-Dose Customization** - Mix and match different esters in the same schedule

---

## 🚀 Quick Start

**[Try it live here!](https://jessibug-os.github.io/EstraDial)** No installation needed! 💝

Or run it locally:

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and start planning! 🎉

---

## 🎯 How to Use

1. **Click on days** in the calendar to add injections
2. **Click existing injections** to edit dose amount and ester type
3. **Adjust the schedule length** to match your cycle
4. **Toggle "Repeat"** to see what steady-state levels look like
5. **Watch the graph** update in real-time! 📈

---

## 🧪 Available Esters

- Estradiol Benzoate
- Estradiol Valerate (default)
- Estradiol Cypionate
- Estradiol Cypionate Suspension
- Estradiol Enanthate
- Estradiol Undecylate
- Polyestradiol Phosphate

Each ester has unique pharmacokinetic parameters (D, k1, k2, k3) that affect how quickly it's absorbed and metabolized!

---

## 📚 The Science

EstraDial uses a three-compartment pharmacokinetic model:

```
c(t) = (dose × D / 5) × k1 × k2 × [exponential decay terms]
```

Where:
- **D** = Dose constant (varies by ester)
- **k1, k2, k3** = Rate constants for absorption and elimination
- **t** = Time in days since injection

The model calculates concentration for each injection and sums them to show total levels over time.

---

## 🛠️ Built With

- **React 19** + TypeScript
- **Recharts** for beautiful visualizations
- **Create React App** for the foundation
- **GitHub Pages** for hosting
- Lots of ✨ and 💝

---

## ⚠️ Important Note

**This tool is for educational purposes only!** Always consult with your healthcare provider about hormone therapy. This calculator provides estimates based on pharmacokinetic models, but individual responses can vary.

---

## 💖 Contributing

Found a bug? Have an idea? Open an issue or PR! All contributions welcome 🌈

---

## 📜 License

MIT License - feel free to use, modify, and share!

---

<p align="center">
  Made with 💙 by <a href="https://github.com/jessibug-os">jessibug-os</a>
</p>
