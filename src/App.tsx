import React, { useState, useEffect, useRef } from "react";

// UNO 网页演示版（含主菜单、规则、卡牌图鉴、功能牌、跳过抽牌逻辑）
const COLORS = ["yellow", "green", "blue", "red"];

// 卡牌图片映射
const CARD_IMAGE_MAP = {
  // 红色卡牌
  red_0: "red_0.jpg",
  red_1: "red_1.jpg",
  red_2: "red_2.jpg",
  red_3: "red_3.jpg",
  red_4: "red_4.jpg",
  red_5: "red_5.jpg",
  red_6: "red_6.jpg",
  red_7: "red_7.jpg",
  red_8: "red_8.jpg",
  red_9: "red_9.jpg",
  red_skip: "red_skip.jpg",
  red_reverse: "red_reverse.jpg",
  "red_+2": "red_draw2.jpg",

  // 黄色卡牌
  yellow_0: "yellow_0.jpg",
  yellow_1: "yellow_1.jpg",
  yellow_2: "yellow_2.jpg",
  yellow_3: "yellow_3.jpg",
  yellow_4: "yellow_4.jpg",
  yellow_5: "yellow_5.jpg",
  yellow_6: "yellow_6.jpg",
  yellow_7: "yellow_7.jpg",
  yellow_8: "yellow_8.jpg",
  yellow_9: "yellow_9.jpg",
  yellow_skip: "yellow_skip.jpg",
  yellow_reverse: "yellow_reverse.jpg",
  "yellow_+2": "yellow_draw2.jpg",

  // 绿色卡牌
  green_0: "green_0.jpg",
  green_1: "green_1.jpg",
  green_2: "green_2.jpg",
  green_3: "green_3.jpg",
  green_4: "green_4.jpg",
  green_5: "green_5.jpg",
  green_6: "green_6.jpg",
  green_7: "green_7.jpg",
  green_8: "green_8.jpg",
  green_9: "green_9.jpg",
  green_skip: "green_skip.jpg",
  green_reverse: "green_reverse.jpg",
  "green_+2": "green_draw2.jpg",

  // 蓝色卡牌
  blue_0: "blue_0.jpg",
  blue_1: "blue_1.jpg",
  blue_2: "blue_2.jpg",
  blue_3: "blue_3.jpg",
  blue_4: "blue_4.jpg",
  blue_5: "blue_5.jpg",
  blue_6: "blue_6.jpg",
  blue_7: "blue_7.jpg",
  blue_8: "blue_8.jpg",
  blue_9: "blue_9.jpg",
  blue_skip: "blue_skip.jpg",
  blue_reverse: "blue_reverse.jpg",
  "blue_+2": "blue_draw2.jpg",

  // 黑色万能牌
  black_wild: "wild.jpg",
  "black_+4": "wild_draw4.jpg",
};

// 获取卡牌图片路径的函数
function getCardImage(card) {
  // 对于万能牌，始终使用黑色作为颜色，这样即使选择了颜色也仍然显示黑色万能牌
  const isWildCard = card.value === "wild" || card.value === "+4";
  const color = isWildCard ? "black" : card.color;
  const key = `${color}_${card.value}`;
  const imageName = CARD_IMAGE_MAP[key] || "card_back.jpg";
  return `/images/cards/${imageName}`;
}

function id() {
  return Math.random().toString(36).slice(2, 9);
}

function generateDeck() {
  const deck = [];
  // 每色：1 个 0，2 个 1~9 与动作牌
  COLORS.forEach((color) => {
    deck.push({ id: id(), color, value: "0" });
    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "reverse", "+2"];
    for (let copy = 0; copy < 2; copy++) {
      vals.forEach((v) => deck.push({ id: id(), color, value: String(v) }));
    }
  });
  // 4 个 wild，4 个 +4
  for (let i = 0; i < 4; i++)
    deck.push({ id: id(), color: "black", value: "wild" });
  for (let i = 0; i < 4; i++)
    deck.push({ id: id(), color: "black", value: "+4" });
  return shuffle(deck);
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlayOn(card, topCard) {
  if (!card || !topCard) return false;
  return (
    card.color === "black" ||
    card.color === topCard.color ||
    card.value === topCard.value
  );
}

export default function UnoGame() {
  const [screen, setScreen] = useState("menu"); // menu | rules | cards | game

  const [deck, setDeck] = useState([]);
  const [players, setPlayers] = useState([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 是玩家
  const [discardPile, setDiscardPile] = useState([]);
  const [direction, setDirection] = useState(1); // 1 顺时针， -1 逆时针
  const [aiThinking, setAiThinking] = useState(false);
  const [timer, setTimer] = useState(30);
  const [chooseColor, setChooseColor] = useState(null); // { cardId, playerIndex, plus4 }
  const [winner, setWinner] = useState(null);

  // 玩家抽牌特殊状态（用于“跳过抽一张”的规则）
  const [playerDrawnThisTurn, setPlayerDrawnThisTurn] = useState(false);
  const [playerDrawnPlayable, setPlayerDrawnPlayable] = useState(false);
  const [lastDrawnCardId, setLastDrawnCardId] = useState(null);

  //玩家选择的牌索引
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  const aiTimerRef = useRef(null);

  // ---------- 游戏初始化 ----------
  function startGame() {
    const newDeck = generateDeck();
    const hands = [[], [], [], []];
    const deckCopy = newDeck.slice();
    // 发牌，每人 8 张
    for (let i = 0; i < 8; i++) {
      for (let p = 0; p < 4; p++) {
        hands[p].push(deckCopy.pop());
      }
    }
    // 翻开一张作为弃牌顶
    let top = deckCopy.pop();

    // 如果弃牌堆顶是万能牌，则继续抽牌直到抽到非万能牌
    while (
      top.color === "black" &&
      (top.value === "wild" || top.value === "+4")
    ) {
      // 将万能牌放回牌堆底部
      deckCopy.unshift(top);
      // 重新抽一张牌
      top = deckCopy.pop();
    }

    setDeck(deckCopy);
    setPlayers(hands);
    setDiscardPile([top]);
    setCurrentPlayer(0);
    setDirection(1);
    setChooseColor(null);
    setWinner(null);
    setPlayerDrawnThisTurn(false);
    setPlayerDrawnPlayable(false);
    setLastDrawnCardId(null);
    setScreen("game");
  }

  // ---------- 辅助函数：循环与洗牌 ----------
  function getNextIndex(from, step = 1) {
    // 例如 step=1 表示下一个人，step=2 表示再下一个（用于 skip +2 效果）
    return (from + direction * step + 4 * 100) % 4;
  }

  function reshuffleIfNeeded() {
    // 当牌堆耗尽时，把弃牌堆（除了顶牌）洗回牌堆
    if (deck.length > 0) return;
    if (discardPile.length <= 1) return; // 无法重洗
    const top = discardPile[discardPile.length - 1];
    const rest = discardPile.slice(0, -1);
    const newDeck = shuffle(rest);
    setDeck(newDeck);
    setDiscardPile([top]);
  }

  // 抽一张牌并返回该卡（若无法抽返回 null）
  function drawOne(playerIndex) {
    return drawCards(playerIndex, 1)?.[0] || null;
  }

  function drawCards(playerIndex, count) {
    if (count <= 0) return [];

    let deckCopy = deck.slice();
    const drawnCards = [];

    // 收集所有需要的牌
    for (let i = 0; i < count; i++) {
      if (deckCopy.length === 0) {
        // 触发重洗
        const rest = discardPile.slice(0, -1);
        if (rest.length === 0) {
          // 无法抽牌
          break;
        }
        const newShuffled = shuffle(rest);
        deckCopy = [...newShuffled];
        setDiscardPile([discardPile[discardPile.length - 1]]);
      }

      const drawn = deckCopy.pop();
      if (drawn) {
        drawnCards.push({ ...drawn });
      }
    }

    // 更新牌堆
    setDeck(deckCopy);

    // 更新玩家手牌
    setPlayers((prev) =>
      prev.map((hand, i) =>
        i === playerIndex ? [...hand, ...drawnCards] : hand
      )
    );

    return drawnCards;
  }

  // ---------- 出牌与效果 ----------
  function applyCardToDiscard(card) {
    setDiscardPile((prev) => [...prev, { ...card }]);
  }

  function endTurnTo(nextIndex) {
    // 重置玩家临时抽牌状态
    setPlayerDrawnThisTurn(false);
    setPlayerDrawnPlayable(false);
    setLastDrawnCardId(null);
    setSelectedCardIndex(null);
    setCurrentPlayer(nextIndex);
  }

  function handleCardEffectPlayed(card, playerIndex) {
    // card 已经被置入弃牌堆
    if (card.value === "skip") {
      const skipTarget = getNextIndex(playerIndex, 2); // 跳过下一位 -> 下下一位行动
      endTurnTo(skipTarget);
      return;
    }

    if (card.value === "reverse") {
      // 立即反转出牌方向，并计算使用新方向的下一位玩家
      const newDir = -direction;
      setDirection(newDir);
      const nextIdx = (playerIndex + newDir + 4) % 4; // 立即用 newDir 计算下一位
      endTurnTo(nextIdx);
      return;
    }

    if (card.value === "+2") {
      const target = getNextIndex(playerIndex, 1);
      // 目标摸两张并跳过
      drawCards(target, 2);
      const nextIdx = getNextIndex(playerIndex, 2);
      endTurnTo(nextIdx);
      return;
    }

    if (card.value === "wild") {
      if (playerIndex === 0) {
        // 人类需要选择颜色：这个逻辑现在在 onPlayerConfirmPlay 中处理
        return;
      } else {
        // AI 自动选择颜色：选择手中最多颜色
        const hand = players[playerIndex];
        const counts = COLORS.map((c) => ({
          c,
          cnt: hand.filter((x) => x.color === c).length,
        }));
        counts.sort((a, b) => b.cnt - a.cnt);
        const pick = counts[0].c;
        // 将弃牌顶的颜色设置为 pick
        setDiscardPile((prev) => {
          const newPrev = prev.slice();
          newPrev[newPrev.length - 1] = {
            ...newPrev[newPrev.length - 1],
            color: pick,
          };
          return newPrev;
        });
        const nextIdx = getNextIndex(playerIndex, 1);
        endTurnTo(nextIdx);
        return;
      }
    }

    if (card.value === "+4") {
      if (playerIndex === 0) {
        // 人类需要选择颜色和抽牌：这个逻辑现在在 onPlayerConfirmPlay 中处理
        return;
      } else {
        const hand = players[playerIndex];
        const counts = COLORS.map((c) => ({
          c,
          cnt: hand.filter((x) => x.color === c).length,
        }));
        counts.sort((a, b) => b.cnt - a.cnt);
        const pick = counts[0].c;
        setDiscardPile((prev) => {
          const newPrev = prev.slice();
          newPrev[newPrev.length - 1] = {
            ...newPrev[newPrev.length - 1],
            color: pick,
          };
          return newPrev;
        });
        const target = getNextIndex(playerIndex, 1);
        drawCards(target, 4);
        const nextIdx = getNextIndex(playerIndex, 2);
        endTurnTo(nextIdx);
        return;
      }
    }

    // 普通牌，正常下一位
    const nextIdx = getNextIndex(playerIndex, 1);
    endTurnTo(nextIdx);
  }

  // ---------- AI 行为 ----------
  useEffect(() => {
    // 当轮到 AI，触发思考和行动
    if (screen !== "game") return;
    if (winner !== null) return;
    if (currentPlayer !== 0) {
      setAiThinking(true);
      // 1~3 秒延迟
      aiTimerRef.current = setTimeout(() => {
        aiPlay(currentPlayer);
        setAiThinking(false);
      }, Math.floor(Math.random() * 2000) + 1000);
      return () => clearTimeout(aiTimerRef.current);
    }
  }, [currentPlayer, screen, winner]);

  function aiPlay(playerIndex) {
    const hand = players[playerIndex].slice();
    const top = discardPile[discardPile.length - 1];
    // 先找能出的牌（从左到右或任意策略，这里选第一个）
    const idx = hand.findIndex((c) => canPlayOn(c, top));
    if (idx >= 0) {
      const card = hand.splice(idx, 1)[0];
      setPlayers((prev) => prev.map((h, i) => (i === playerIndex ? hand : h)));
      applyCardToDiscard(card);
      handleCardEffectPlayed(card, playerIndex);
      if (hand.length === 0) setWinner(playerIndex);
      return;
    }
    // 没有可出 -> 抽一张，如果抽到可出则立即打出
    const drawn = drawOne(playerIndex);
    if (!drawn) {
      // 无牌可抽，直接结束回合
      endTurnTo(getNextIndex(playerIndex, 1));
      return;
    }
    const newTop = discardPile[discardPile.length - 1];
    if (canPlayOn(drawn, newTop)) {
      // 立刻出牌
      setPlayers((prev) =>
        prev.map((h, i) =>
          i === playerIndex ? h.filter((x) => x.id !== drawn.id) : h
        )
      );
      applyCardToDiscard(drawn);
      handleCardEffectPlayed(drawn, playerIndex);
      const handAfter = players[playerIndex].filter((x) => x.id !== drawn.id);
      if (handAfter.length === 0) setWinner(playerIndex);
      return;
    }
    // 抽到不可出，则结束回合
    endTurnTo(getNextIndex(playerIndex, 1));
  }

  // ---------- 玩家行为（出牌 / 跳过 / 提示） ----------
  // 玩家点击手牌出牌
  function onPlayerPlayCard(cardIndex, updatedCard = null) {
    if (screen !== "game" || currentPlayer !== 0 || winner !== null) return;
    const hand = players[0].slice();
    const card = updatedCard || hand[cardIndex];
    const top = discardPile[discardPile.length - 1];
    if (!updatedCard && !canPlayOn(card, top)) return; // 不允许出牌

    // 出牌（从手牌中移除）
    if (!updatedCard) {
      // 普通牌出牌逻辑
      hand.splice(cardIndex, 1);
      setPlayers((prev) => prev.map((h, i) => (i === 0 ? hand : h)));
    } else {
      // 万能牌出牌逻辑（已选择颜色）
      const newHand = hand.filter((_, idx) => idx !== cardIndex);
      setPlayers((prev) => prev.map((h, i) => (i === 0 ? newHand : h)));
    }

    applyCardToDiscard(card);

    // 如果之前是通过抽牌获得的，则清空那状态
    setPlayerDrawnThisTurn(false);
    setPlayerDrawnPlayable(false);
    setLastDrawnCardId(null);

    // 处理功能牌效果（包括可能需要选择颜色）
    if (!updatedCard) {
      handleCardEffectPlayed(card, 0);
    } else {
      // 万能牌已选择颜色，直接处理效果
      if (card.value === "+4") {
        const target = getNextIndex(0, 1);
        drawCards(target, 4);
        const nextIdx = getNextIndex(0, 2);
        endTurnTo(nextIdx);
      } else {
        const nextIdx = getNextIndex(0, 1);
        endTurnTo(nextIdx);
      }
    }

    if (updatedCard) {
      const newHand = hand.filter((_, idx) => idx !== cardIndex);
      if (newHand.length === 0) setWinner(0);
    } else {
      if (hand.length === 0) setWinner(0);
    }
  }

  // 玩家确认出牌按钮
  function onPlayerConfirmPlay() {
    if (selectedCardIndex === null) return;
    const hand = players[0];
    const card = hand[selectedCardIndex];
    const top = discardPile[discardPile.length - 1];
    if (!canPlayOn(card, top)) return;

    // 如果是万能牌且还没有选择颜色，则进入颜色选择状态
    if ((card.value === "wild" || card.value === "+4") && !chooseColor) {
      // 设置选择颜色状态，但不立即出牌
      setChooseColor({
        card: card,
        playerIndex: 0,
        plus4: card.value === "+4",
      });
      return;
    }

    // 如果已经选择了颜色，则使用选择的颜色出牌
    if (chooseColor) {
      const { card: wildCard, chosenColor } = chooseColor;
      const updatedCard = { ...wildCard, color: chosenColor };
      onPlayerPlayCard(selectedCardIndex, updatedCard);
    } else {
      // 非万能牌直接出牌
      onPlayerPlayCard(selectedCardIndex);
    }

    setSelectedCardIndex(null);
    setChooseColor(null);
  }

  // 玩家点击跳过按钮：实现描述的规则
  // - 第一次点击跳过：抽一张牌
  //   - 如果抽到可出的牌 -> 高亮，不结束回合（需要再次点击跳过才结束）
  //   - 如果抽到不可出 -> 立即结束回合
  // - 如果已经抽到可出的牌并高亮（playerDrawnThisTurn=true），再次点击跳过会结束回合
  function onPlayerSkip() {
    if (screen !== "game" || currentPlayer !== 0 || winner !== null) return;

    const top = discardPile[discardPile.length - 1];

    if (!playerDrawnThisTurn) {
      // 抽一张
      const drawn = drawOne(0);
      if (!drawn) {
        // 无法抽牌 -> 直接结束回合
        endTurnTo(getNextIndex(0, 1));
        return;
      }
      setLastDrawnCardId(drawn.id);
      // 抽到后判断是否可出
      if (canPlayOn(drawn, top)) {
        // 高亮并保留回合
        setPlayerDrawnThisTurn(true);
        setPlayerDrawnPlayable(true);
        // 玩家可以选择出牌或再次点击跳过
        return;
      } else {
        // 直接跳过回合
        setPlayerDrawnThisTurn(false);
        setPlayerDrawnPlayable(false);
        setLastDrawnCardId(null);
        endTurnTo(getNextIndex(0, 1));
        return;
      }
    } else {
      // 已经抽到可出的牌，玩家选择再次点击跳过 -> 真正结束回合
      setPlayerDrawnThisTurn(false);
      setPlayerDrawnPlayable(false);
      setLastDrawnCardId(null);
      endTurnTo(getNextIndex(0, 1));
      return;
    }
  }

  // 玩家点击提示：从右到左第一个能出的牌
  function onPlayerHint() {
    if (screen !== "game" || currentPlayer !== 0 || winner !== null) return;
    const hand = players[0].slice();
    const top = discardPile[discardPile.length - 1];
    for (let i = hand.length - 1; i >= 0; i--) {
      if (canPlayOn(hand[i], top)) {
        onPlayerPlayCard(i);
        return;
      }
    }
    // 没有可出：提示抽牌逻辑（不自动抽）
  }

  // 玩家选择万能牌颜色（wild 或 +4）
  function onChooseColor(c) {
    if (!chooseColor) return;

    // 只记录选择的颜色，不立即出牌
    setChooseColor((prev) => ({
      ...prev,
      chosenColor: c,
    }));
  }

  // 倒计时管理（仅玩家回合）
  useEffect(() => {
    if (screen !== "game") return;
    if (winner !== null) return;

    if (currentPlayer === 0) {
      setTimer(30);
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentPlayer, screen, winner]);

  useEffect(() => {
    if (timer <= 0 && currentPlayer === 0 && screen === "game") {
      // 超时 -> 尝试按跳过逻辑自动跳过（即先抽一张）
      // 如果已经抽过且抽到可出 -> 再次超时则跳过
      if (!playerDrawnThisTurn) {
        onPlayerSkip();
      } else {
        // 第二次超时则结束回合
        onPlayerSkip();
      }
    }
  }, [timer]);

  // ---------- 菜单 / 规则 / 图鉴 视图 ----------
  function RulesView() {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">UNO 规则（简要）</h2>
        <ul className="list-disc pl-6">
          <li>
            每人 8 张牌，每回合出一张牌，需匹配颜色或数字/符号或出万能牌。
          </li>
          <li>
            特殊牌：skip（跳过）、reverse（反转）、+2（下一位摸 2 并跳过）。
          </li>
          <li>万能牌：wild（变色）、+4（变色并让下一位摸 4 并跳过）。</li>
          <li>牌堆耗尽时把弃牌（除顶牌）洗回牌堆继续。</li>
        </ul>
        <button
          className="mt-4 px-3 py-2 bg-gray-200 rounded"
          onClick={() => setScreen("menu")}
        >
          返回
        </button>
      </div>
    );
  }

  function CardsView() {
    const sample = [];
    COLORS.forEach((color) => {
      sample.push({ id: id(), color, value: "0" });
      for (let v = 1; v <= 9; v++)
        sample.push({ id: id(), color, value: String(v) });
      ["skip", "reverse", "+2"].forEach((a) =>
        sample.push({ id: id(), color, value: a })
      );
    });
    sample.push({ id: id(), color: "black", value: "wild" });
    sample.push({ id: id(), color: "black", value: "+4" });

    // 添加卡背和颜色选择图片示例
    const additionalCards = [
      { id: "cardback", name: "卡背", image: "/images/cards/card_back.jpg" },
      {
        id: "red_choose",
        name: "红色选择",
        image: "/images/color-choose/red_choose.jpg",
      },
      {
        id: "yellow_choose",
        name: "黄色选择",
        image: "/images/color-choose/yellow_choose.jpg",
      },
      {
        id: "green_choose",
        name: "绿色选择",
        image: "/images/color-choose/green_choose.jpg",
      },
      {
        id: "blue_choose",
        name: "蓝色选择",
        image: "/images/color-choose/blue_choose.jpg",
      },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">卡牌图鉴（示例）</h2>
        <div className="grid grid-cols-6 gap-3">
          {sample.map((c) => (
            <div key={c.id} className="p-1 rounded">
              <img
                src={getCardImage(c)}
                alt={`${c.color} ${c.value}`}
                className="w-full h-full object-cover rounded"
              />
            </div>
          ))}
          {additionalCards.map((c) => (
            <div key={c.id} className="p-1 rounded">
              <img
                src={c.image}
                alt={c.name}
                className="w-full h-full object-cover rounded"
              />
            </div>
          ))}
        </div>
        <button
          className="mt-4 px-3 py-2 bg-gray-200 rounded"
          onClick={() => setScreen("menu")}
        >
          返回
        </button>
      </div>
    );
  }

  // ---------- 主渲染 ----------
  return (
    <div className="p-4 min-h-screen relative">
      {screen === "menu" && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/images/cards/card_back.jpg')" }}
        ></div>
      )}
      {screen === "menu" && (
        <div className="flex flex-col gap-3 max-w-sm mx-auto h-screen justify-center relative z-10">
          <h1 className="text-2xl font-bold text-center">UNO 网页演示</h1>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            开始游戏
          </button>
          <button
            onClick={() => setScreen("rules")}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            游戏规则
          </button>
          <button
            onClick={() => setScreen("cards")}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            卡牌图鉴
          </button>
        </div>
      )}

      {screen === "rules" && <RulesView />}
      {screen === "cards" && <CardsView />}

      {screen === "game" && (
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div
              className={`p-2 rounded ${
                currentPlayer === 0 ? "bg-green-200" : ""
              }`}
            >
              当前玩家:
              {currentPlayer === 0
                ? "你"
                : currentPlayer === 1
                ? "左侧AI"
                : currentPlayer === 2
                ? "上方AI"
                : "右侧AI"}
              {aiThinking && currentPlayer !== 0 && "（思考中...）"}
            </div>
            <div>出牌方向: {direction === 1 ? "顺时针" : "逆时针"}</div>
          </div>

          <div className="flex justify-around mb-3">
            <div className="flex flex-col items-center">
              <div className="text-center mb-1">左侧 AI</div>
              <div
                className={
                  currentPlayer === 1 ? "bg-yellow-200 p-2 rounded" : ""
                }
              >
                <div className="w-14 h-22 flex items-center justify-center rounded">
                  <img
                    src="/images/cards/card_back.jpg"
                    alt="AI手牌"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              </div>
              <div className="mt-1">x{players[1].length}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-center mb-1">上方 AI</div>
              <div
                className={
                  currentPlayer === 2 ? "bg-yellow-200 p-2 rounded" : ""
                }
              >
                <div className="w-14 h-22 flex items-center justify-center rounded">
                  <img
                    src="/images/cards/card_back.jpg"
                    alt="AI手牌"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              </div>
              <div className="mt-1">x{players[2].length}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-center mb-1">右侧 AI</div>
              <div
                className={
                  currentPlayer === 3 ? "bg-yellow-200 p-2 rounded" : ""
                }
              >
                <div className="w-14 h-22 flex items-center justify-center rounded">
                  <img
                    src="/images/cards/card_back.jpg"
                    alt="AI手牌"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              </div>
              <div className="mt-1">x{players[3].length}</div>
            </div>
          </div>

          <div className="flex justify-start mb-4 items-center">
            {/* 牌堆显示 */}
            <div className="flex flex-col items-center mr-8">
              <div className="w-14 h-22 flex items-center justify-center rounded">
                <img
                  src="/images/cards/card_back.jpg"
                  alt="牌堆"
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div className="mt-1">牌堆: {deck.length} 张</div>
            </div>

            {/* 弃牌堆显示 */}
            <div className="flex-grow flex justify-center">
              {discardPile.length > 0 && (
                <>
                  {/* 当弃牌堆顶是万能牌且已选择颜色时，显示颜色图案 */}
                  {discardPile[discardPile.length - 1].color !== "black" &&
                    (discardPile[discardPile.length - 1].value === "wild" ||
                      discardPile[discardPile.length - 1].value === "+4") && (
                      <div className="w-12 h-12 flex items-center justify-center rounded mr-2">
                        <img
                          src={`/images/color-choose/${
                            discardPile[discardPile.length - 1].color
                          }_choose.jpg`}
                          alt={discardPile[discardPile.length - 1].color}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    )}
                  <div className="w-20 h-28 flex items-center justify-center rounded">
                    <img
                      src={getCardImage(discardPile[discardPile.length - 1])}
                      alt={`${discardPile[discardPile.length - 1].color} ${
                        discardPile[discardPile.length - 1].value
                      }`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          {currentPlayer === 0 && !winner && (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={onPlayerSkip}
                className="px-3 py-2 bg-gray-300 rounded"
              >
                跳过
              </button>
              <button
                onClick={onPlayerHint}
                className="px-3 py-2 bg-yellow-300 rounded"
              >
                提示
              </button>
              <button
                onClick={onPlayerConfirmPlay}
                disabled={
                  selectedCardIndex === null ||
                  !canPlayOn(
                    players[0][selectedCardIndex],
                    discardPile[discardPile.length - 1]
                  ) ||
                  (chooseColor && !chooseColor.chosenColor)
                }
                className={`px-3 py-2 rounded ${
                  selectedCardIndex !== null &&
                  canPlayOn(
                    players[0][selectedCardIndex],
                    discardPile[discardPile.length - 1]
                  ) &&
                  !(chooseColor && !chooseColor.chosenColor)
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                出牌
              </button>
              <div className="ml-auto">倒计时: {timer}s</div>
            </div>
          )}

          {/* 变色选择 */}
          {chooseColor && currentPlayer === 0 && (
            <div className="flex gap-2 mb-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChooseColor(c)}
                  className={`w-16 h-16 p-0 border-0 rounded cursor-pointer ${
                    chooseColor.chosenColor === c ? "ring-4 ring-blue-500" : ""
                  }`}
                >
                  <img
                    src={`/images/color-choose/${c}_choose.jpg`}
                    alt={c}
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}

          {/* 玩家手牌，可出牌时高亮 */}
          <div className={`p-2 rounded ${currentPlayer === 0 ? "bg-green-100" : ""}`}>
            <div className="font-bold mb-2">你:</div>
            <div className="flex flex-wrap">
              {players[0].map((card, idx) => {
                const top = discardPile[discardPile.length - 1];
                const playable = canPlayOn(card, top);
                const isSelected = selectedCardIndex === idx;
                // 当选中不可出牌时，仍然显示可出牌高亮
                // 当选中可出牌时，只显示选中高亮而不显示可出牌高亮
                const showPlayable = playable && !(isSelected && playable);
                return (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCardIndex(idx)}
                    className={`w-20 h-28 m-2 flex items-center justify-center rounded cursor-pointer
                      ${showPlayable ? "ring-4 ring-green-400" : ""}
                      ${isSelected ? "ring-4 ring-blue-500" : ""}`}
                  >
                    <img 
                      src={getCardImage(card)} 
                      alt={`${card.color} ${card.value}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {winner !== null && (
            <div className="mt-4 text-2xl text-green-600">
              游戏结束：{winner === 0 ? "你" : `AI${winner}`} 获胜！
            </div>
          )}

          {/* 返回菜单 */}
          <div className="mt-6">
            <button
              onClick={() => setScreen("menu")}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              返回菜单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
