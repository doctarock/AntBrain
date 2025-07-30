// Phase 2.1 - Adds agent-to-agent communication
window.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  const WORLD_BOUNDS = {
    minX: -20,
    maxX: 20,
    minZ: -20,
    maxZ: 20
  };
  scene.gravity = new BABYLON.Vector3(0, -0.9, 0);
  scene.collisionsEnabled = true;

  const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 35, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.applyGravity = true;
  camera.checkCollisions = true;

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
  ground.checkCollisions = true;

  const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const obstacles = [];
  for (let i = 0; i < 3; i++) {
    const wall = BABYLON.MeshBuilder.CreateBox("wall" + i, { width: 5, height: 2, depth: 0.5 }, scene);
    wall.position = new BABYLON.Vector3(Math.random() * 20 - 10, 1, Math.random() * 20 - 10);
    wall.checkCollisions = true;
    wall.material = new BABYLON.StandardMaterial("matWall" + i, scene);
    wall.material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    obstacles.push(wall);
  }

  const resources = [];
  for (let i = 0; i < 5; i++) {
    const res = BABYLON.MeshBuilder.CreateBox("resource" + i, { size: 0.7 }, scene);
    res.position = new BABYLON.Vector3(Math.random() * 30 - 15, 0.35, Math.random() * 30 - 15);
    res.material = new BABYLON.StandardMaterial("mat" + i, scene);
    res.material.diffuseColor = new BABYLON.Color3(1, 1, 0);
    res.smell = { type: "food", strength: 5 };  // or scent profile
    resources.push(res);
  }

  class AntAgent {
    constructor(id, position, color) {
      this.id = id;      
      switch (id) {
        case 1: this.name = "Antsy Pants"; break;
        case 2: this.name = "Tiny Tina"; break;
        default: this.name = "Captain Crumb"; break;
      }
      this.purpose = "explore";
      this.goal = "explore";
      this.emotion = "curious";
      this.mesh = BABYLON.MeshBuilder.CreateSphere("ant" + id, { diameter: 1 }, scene);
      this.mesh.position = position.clone();
      this.mesh.material = new BABYLON.StandardMaterial("mat" + id, scene);
      this.mesh.material.diffuseColor = color;
      this.direction = new BABYLON.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      this.speed = 1;
      this.frameCounter = 0;
      this.environmentThinkCounter = 0;
      this.memory = {
        map: {},
        perceptions: [],
        messages: [],
        thoughts: [],
        encounters: [],
        traits: {},
      };
      this.hunger = 0; // starts full
      this.inventory = []; // carried items
      this.shouldMove = false;
      this.createSpeechLabel();
    }

    createSpeechLabel() {
      this.textPlane = BABYLON.MeshBuilder.CreatePlane("textPlane" + this.id, { width: 6, height: 1 }, scene);
      this.textPlane.position = this.mesh.position.add(new BABYLON.Vector3(0, 2, 0));
      const textTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.textPlane);
      this.textBlock = new BABYLON.GUI.TextBlock();
      this.textBlock.text = "";
      this.textBlock.color = "white";
      this.textBlock.fontSize = 24;
      textTexture.addControl(this.textBlock);
    }

    updateSpeech(message) {
      this.textBlock.text = message || "";
      this.textPlane.position = this.mesh.position.add(new BABYLON.Vector3(0, 2, 0));
    }
  perceive(allAgents, resources, obstacles) {
    // Sight: see agents and resources in front
    const visibleAgents = allAgents.filter(a => {
      if (a === this) return false;
      const dirToAgent = a.mesh.position.subtract(this.mesh.position).normalize();
      return BABYLON.Vector3.Dot(dirToAgent, this.direction) > 0.5 &&
            BABYLON.Vector3.Distance(a.mesh.position, this.mesh.position) < 10;
    });

    const visibleResources = resources.filter(r => {
      const dirToRes = r.position.subtract(this.mesh.position).normalize();
      return BABYLON.Vector3.Dot(dirToRes, this.direction) > 0.5 &&
            BABYLON.Vector3.Distance(r.position, this.mesh.position) < 10;
    });


    // Smell: detect nearby resources with smell
    const smells = resources.filter(r =>
      r.smell && BABYLON.Vector3.Distance(this.mesh.position, r.position) < r.smell.strength
    );

    // Hearing: pick up messages from nearby speaking agents
    this.hearingRange = 5; // or whatever makes sense spatially

    const heard = allAgents
      .filter(a => a !== this && a.textBlock && a.textBlock.text)
      .filter(a => BABYLON.Vector3.Distance(a.mesh.position, this.mesh.position) < this.hearingRange)
      .map(a => `${a.name} says: "${a.textBlock.text}"`);

    return {
      agents: visibleAgents,
      resources: visibleResources,
      smells,
      heard
    };
  }


    receiveMessage(from, content) {
      if (!this.memory.messages.includes(`${from.name} said: "${content}"`)) {
      this.memory.messages.push(`${from.name} said: "${content}"`);
    }
      if (this.memory.messages.length > 5) this.memory.messages.shift();
    }

    buildPrompt(perception,visitedTiles,wasHereBefore,key) {
  const agentsSeen = perception.agents.map(a => a.name).join(", ") || "none";
  const resourcesSeen = perception.resources.length > 0 ? "resources nearby" : "no resources";
  const smells = perception.smells.map(s => s.smell?.type).join(", ") || "none";
  const sounds = perception.heard.join("; ") || "none";
  const obstacle = perception.blocked ? "Obstacle ahead." : "Path clear.";

  return `You are a simulated ant in a 3D environment.
- Vision: ${agentsSeen}, ${resourcesSeen}
- Smell: ${smells}
- Hearing: ${sounds}
- Touch: ${obstacle}

You are currently at (${key}). This tile was ${wasHereBefore ? "visited before" : "not visited"}.
You have explored approximately ${visitedTiles} unique tiles so far.

Use this info to decide whether to move or stay, and where to go.

React using instinct. DO NOT talk or reflect. Just act.
Respond with:
Action: ...
Reason: ...`;
}


    async think(perception, allAgents) {
      this.frameCounter++;
      if (this.frameCounter < 120) return this.updatePosition();
      this.frameCounter = 0;
      this.environmentThinkCounter++;
      this.memory.perceptions.push({
        tick: performance.now(),

        // What the agent sees and where
        seen: perception.agents.map(a => ({
          name: a.name,
          position: {
            x: a.mesh.position.x,
            z: a.mesh.position.z
          }
        })),

        // Heard speech nearby
        heard: perception.heard,

        // Smell types
        smelled: perception.smells.map(s => s.smell?.type || "unknown"),

        // Any obstacle ahead
        obstacle: perception.blocked,

        // Where the agent was
        selfPosition: {
          x: this.mesh.position.x,
          z: this.mesh.position.z
        },

        // Emotion & goal at the time
        emotion: this.emotion,
        goal: this.goal
      });

      // Limit to last 30 for memory constraints
      if (this.memory.perceptions.length > 30) {
        this.memory.perceptions.shift();
      }
      this.blocked = perception.blocked;
      // Convert position to grid key
      const toKey = (x, z) => `${Math.floor(x)}_${Math.floor(z)}`;
      const key = toKey(this.mesh.position.x, this.mesh.position.z);

      // Initialize map cell if needed
      if (!this.memory.map[key]) {
        this.memory.map[key] = { visited: false, resources: [], agents: [] };
      }

      const mapCell = this.memory.map[key];
      mapCell.visited = true;

      // Log seen agents
      mapCell.agents = perception.agents.map(a => a.name);

      // Log smelled resources (if nearby and strong)
      for (const r of perception.smells) {
        const type = r.smell?.type || "unknown";
        if (!mapCell.resources.includes(type)) {
          mapCell.resources.push(type);
        }
      }

      if (this.environmentThinkCounter % 5 === 0) {
        return this.deepThought(perception, allAgents);
      }
      const visitedTiles = Object.keys(this.memory.map).length;

      const nearbyMemory = this.memory.map[key];
      const wasHereBefore = nearbyMemory && nearbyMemory.visited;
      const prompt = this.buildPrompt(perception,visitedTiles,wasHereBefore,key);
      try {
        const res = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openhermes", prompt, stream: false })
        });
        const data = await res.json();
        const response = data.response.trim();
        console.log(`${this.name} thought:`, response);

        const extract = (label) => {
          const match = response.match(new RegExp(`${label}:\s*(.*)`, "i"));
          return match ? match[1].trim() : null;
        };

        this.goal = extract("NewGoal") || this.goal;
        this.emotion = extract("Emotion") || this.emotion;
        this.name = extract("Name") || this.name;
        this.purpose = extract("Purpose") || this.purpose;
        this.updateSpeech("");

        const action = (extract("Action") || "").toLowerCase();
        this.shouldMove = !action.includes("stay") && action !== "";
        let moveVector = null;
        const coordMatch = action.match(/(-?\d+)_(-?\d+)/);

        if (coordMatch) {
          const targetX = parseInt(coordMatch[1], 10);
          const targetZ = parseInt(coordMatch[2], 10);
          const target = new BABYLON.Vector3(targetX, this.mesh.position.y, targetZ);

          moveVector = target.subtract(this.mesh.position).normalize();
          this.direction = moveVector;
          this.goalTile = { x: targetX, z: targetZ };
          this.shouldMove = true;
        } else if (action.includes("left")) this.direction = new BABYLON.Vector3(-1, 0, 0);
        else if (action.includes("right")) this.direction = new BABYLON.Vector3(1, 0, 0);
        else if (action.includes("forward")) this.direction = new BABYLON.Vector3(0, 0, 1);
        else if (action.includes("back")) this.direction = new BABYLON.Vector3(0, 0, -1);
        else if (action.includes("stay")) this.direction = new BABYLON.Vector3(0, 0, 0);
        else if (action.includes("resource") && perception.resources.length > 0) {
          this.direction = perception.resources[0].position.subtract(this.mesh.position).normalize();
        }

      } catch (err) {
        console.error("LLM error:", err);
      }

      this.updatePosition();
    }

    updatePosition() {

      if (this.goalTile) {
        const goalVec = new BABYLON.Vector3(this.goalTile.x, this.mesh.position.y, this.goalTile.z);
        const dist = BABYLON.Vector3.Distance(this.mesh.position, goalVec);

        if (dist < 0.5) {
          this.shouldMove = false;
          this.goalTile = null; // arrived
        } else {
          this.direction = goalVec.subtract(this.mesh.position).normalize();
          const nextPos = this.mesh.position.add(this.direction.scale(this.speed));
          
          const withinBounds = (
            nextPos.x >= WORLD_BOUNDS.minX &&
            nextPos.x <= WORLD_BOUNDS.maxX &&
            nextPos.z >= WORLD_BOUNDS.minZ &&
            nextPos.z <= WORLD_BOUNDS.maxZ
          );

          const blocked = obstacles.some(ob =>
            BABYLON.Vector3.Distance(nextPos, ob.position) < 1.5
          );

          if (this.shouldMove && withinBounds && !blocked) {
            this.mesh.position = nextPos;
          }
        }
      } else {
        
        const nextPos = this.mesh.position.add(this.direction.scale(this.speed));
        const withinBounds = (
          nextPos.x >= WORLD_BOUNDS.minX &&
          nextPos.x <= WORLD_BOUNDS.maxX &&
          nextPos.z >= WORLD_BOUNDS.minZ &&
          nextPos.z <= WORLD_BOUNDS.maxZ
        );

        const blocked = obstacles.some(ob =>
          BABYLON.Vector3.Distance(nextPos, ob.position) < 1.5
        );
        if (this.shouldMove && !this.blocked && withinBounds) {
          this.mesh.position.addInPlace(this.direction.scale(this.speed));
          this.shouldMove = false;
        }
      }

      this.mesh.position.y = 0.5;
      if (this.mesh.position.x > 20 || this.mesh.position.x < -20) this.direction.x *= -1;
      if (this.mesh.position.z > 20 || this.mesh.position.z < -20) this.direction.z *= -1;
      this.updateSpeech(this.textBlock.text);
    }
    async deepThought(perception, allAgents) {
      const recent = this.memory.perceptions.slice(-3).map(p => {
        const seenSummary = p.seen.map(s => `${s.name} at (${s.position.x.toFixed(1)}, ${s.position.z.toFixed(1)})`).join("; ") || "nothing";
        return `At (${p.selfPosition.x.toFixed(1)}, ${p.selfPosition.z.toFixed(1)}), saw ${seenSummary}, smelled [${p.smelled.join(", ")}], heard [${p.heard.join("; ")}], obstacle: ${p.obstacle}`;
      }).join("\n");
      let foodPrompt = "";
if (perception.resources.length) {
  foodPrompt += `You see food nearby at: ${perception.resources.map(r => `${Math.floor(r.position.x)}_${Math.floor(r.position.z)}`).join(", ")}.\n`;
}
foodPrompt += `Your current hunger level is ${Math.floor(this.hunger * 100)}%.\n`;

      const deepPrompt = `You are in a simulated world and it's time for deep reflection.
Name: ${this.name}.
Purpose: ${this.purpose}.
Emotion: ${this.emotion}.
Goal: ${this.goal}.
You have recently heard: ${this.memory.messages.slice(-3).join("\n") || "nothing."}

${foodPrompt}

Recent perception logs:
${recent}

Reflect on who you are. Do you want to change your name, purpose, emotion, or goal? Would you like to say something to other agents? Would you like to record a long term memory?

Respond with:
Message: ...
NewGoal: ...
NewMemory: ...
Emotion: ...
Name: ...
Purpose: ...`;

      try {
        const res = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openhermes", prompt: deepPrompt, stream: false })
        });
        const data = await res.json();
        const response = data.response.trim();
        console.log(`${this.name} deep thought:`, response);

        const extract = (label) => {
          const match = response.match(new RegExp(`${label}:\s*(.*)`, "i"));
          return match ? match[1].trim() : null;
        };

        this.goal = extract("NewGoal") || this.goal;
        this.emotion = extract("Emotion") || this.emotion;
        this.name = extract("Name") || this.name;
        this.purpose = extract("Purpose") || this.purpose;
        const message = extract("Message");
        if (message) {
          this.updateSpeech(message);
          allAgents.forEach(a => {
            if (a !== this && BABYLON.Vector3.Distance(a.mesh.position, this.mesh.position) < 8) {
              a.receiveMessage(this, message);
            }
          });
        }
      } catch (err) {
        console.error("Deep Thought Error:", err);
      }
      this.updatePosition();
    }
  }



  const agents = [
    new AntAgent(1, new BABYLON.Vector3(-5, 0.5, 0), new BABYLON.Color3(1, 0, 0)),
    new AntAgent(2, new BABYLON.Vector3(5, 0.5, 0), new BABYLON.Color3(0, 1, 0)),
    new AntAgent(3, new BABYLON.Vector3(0, 0.5, 5), new BABYLON.Color3(0, 0, 1)),
  ];

  async function mainLoop() {
    await Promise.all(agents.map(a => {
      const perception = a.perceive(agents, resources, obstacles);
      a.lastPerception = perception; // optional, for reference
      a.hunger += 0.01; // increase over time (tune this)
      if (a.hunger > 1) a.hunger = 1; // cap max hunger
      return a.think(perception, agents);
    }));

    agents.forEach(agent => {
      agent.updatePosition(); // let them act after thinking
    });
    scene.render();
  }

  engine.runRenderLoop(() => { mainLoop(); });
});
