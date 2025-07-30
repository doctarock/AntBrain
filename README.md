# 🐜 AntMind Simulation

An AI-powered agent simulation built with **Babylon.js** and a local LLM (e.g., OpenHermes or DeepSeek on Ollama). Each agent perceives its environment, thinks about actions, and acts in a shared world while building memory and interacting with other agents.

---

## ✨ Features

- **3D Environment (Babylon.js)**  
  - Agents, resources (food), and obstacles in a bounded map  
  - Visual speech bubbles for agent communication  

- **Agents with Cognition**  
  - Perception: vision, smell, hearing, and touch  
  - Two cognitive layers:  
    - `think()`: fast, reflexive exploration and instinctive movement  
    - `deepThought()`: slower, reflective reasoning, social interactions, and goal-setting  
  - Memory: episodic storage of perceptions (tiles visited, resources seen, agents encountered)  
  - Mental Map: builds and remembers explored tiles  

- **Local LLM Integration**  
  - Uses `http://localhost:11434/api/generate` (Ollama) to drive agent behavior  
  - Agents autonomously set goals, explore, communicate, and update their state  

- **Resource Interaction**  
  - Agents develop **hunger** over time  
  - Can detect, pick up, and eat food to reduce hunger  
  - Carry inventory  

---

## 🛠️ Installation

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org/)  
- [Ollama](https://ollama.ai/) or another local LLM endpoint  
  - Models supported: **OpenHermes**, **DeepSeek Coder**

### 2. Install dependencies
```bash
npm install
```

### 3. Run the server
```bash
node server.js
```

This will:  
- Serve the front-end at [http://localhost:3000](http://localhost:3000)  
- Proxy `/api/generate` calls to `http://localhost:11434`

---

## ▶️ Usage

1. Start Ollama:
   ```bash
   ollama serve
   ```
2. Run the app (`node server.js`)
3. Open [http://localhost:3000](http://localhost:3000)
4. Watch the agents explore, think, communicate, and survive in their world!

---

## 🧠 Agent Architecture

### **Perception**
- Sight: detect agents, obstacles, and food in front
- Smell: detect nearby resources
- Hearing: pick up messages from other agents (distance-limited)
- Touch: detect obstacles and world bounds  

### **Memory**
- Stores recent perceptions (`perceptions[]`)
- Builds a tile-based **mental map**
- Remembers messages from other agents  

### **Thought Layers**
- `think()`: 
  - Runs every ~1s  
  - Reflexive decisions (explore, avoid, move)
- `deepThought()`:
  - Runs every 5 `think()` cycles  
  - Reflects on memory, communicates, updates identity/purpose  

---

## ⚙️ Configuration

- **World Bounds:** Set in `WORLD_BOUNDS` in `main.js`
- **Hearing Range:** `this.hearingRange`
- **Speed:** `this.speed`
- **Hunger:**  
  - Increase per tick: `this.hunger += 0.01`  
  - Eating reduces hunger: `this.hunger -= 0.5`  

---

## 🗺️ Future Enhancements

- Smarter pathfinding using the mental map  
- Cooperative tasks (resource sharing, construction)  
- Personality traits (curiosity, friendliness, aggressiveness)  
- Swarm/hive-level planning  

---

## 📂 Project Structure

```
/public
  index.html          # Babylon.js scene
  main.js             # Agent logic
server.js             # Node server and API proxy
```

---

## 🔗 Dependencies

- [Babylon.js](https://www.babylonjs.com/) (3D rendering)
- [Babylon GUI](https://doc.babylonjs.com/features/featuresDeepDive/gui/gui) (speech bubbles)
- [Express.js](https://expressjs.com/) (server)
- [Ollama](https://ollama.ai/) (LLM backend)
