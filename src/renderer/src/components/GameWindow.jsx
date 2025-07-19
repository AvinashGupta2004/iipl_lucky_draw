import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdMinimize } from "react-icons/md";
import { BsTrophy } from "react-icons/bs";
import { CiGift } from "react-icons/ci";

function GameWindow() {
  const [isWindowLoaded, setIsWindowLoaded] = useState(false);
  const [requirements, setRequirements] = useState(null);
  const [finalNumbers, setFinalNumbers] = useState(null);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [isCompletelyFilled, setIsCompletelyFilled] = useState(false);
  const [countMainFilled, setCountMainFilled] = useState(0);
  const [isConsolationFilled, setIsConsolationFilled] = useState(false);
  const [box, setBox] = useState([]);
  const [rollingNumber, setRollingNumber] = useState(["1", "2", "5", "4", "7"]);
  const [isNumberGenerated, setIsNumberGenerated] = useState(true);
  const [mainLines, setMainLines] = useState([]);
  const [consolationLines, setConsolationLines] = useState([]);
  const navigate = useNavigate();
  const [imageDirectoryPath, setImageDirectoryPath] = useState("");
  const screenSizes = {
    840: 6,
    1024: 8,
    1900: 10,
  };

  function getNumberOfBoxes(screenWidth) {
    const sortedKeys = Object.keys(screenSizes)
      .map(Number)
      .sort((a, b) => a - b);

    let numBoxes = null;
    for (const key of sortedKeys) {
      if (screenWidth <= key) {
        numBoxes = screenSizes[key];
        break;
      }
    }
    if (numBoxes === null) {
      numBoxes = screenSizes[sortedKeys[sortedKeys.length - 1]];
    }
    return numBoxes;
  }

  function randomNumber() {
    return Math.floor(
      Math.random() * (requirements.max_range - requirements.min_range + 1),
    ).toString();
  }
  function handleLogout() {
    navigate("/sign-in");
  }
  function handleMinimize() {
    window.api.appMinimize().then();
  }

  // eslint-disable-next-line react/prop-types
  function RollingNumberDigit({ value }) {
    return (
      <div
        className={
          "w-14 h-14 text-center flex justify-center items-center border-1 border-orange-800 bg-yellow-50 text-yellow-800 rounded-md"
        }
      >
        <span className={"block font-bold font-poppins text-4xl"}>{value}</span>
      </div>
    );
  }

  function NumberBox({
    // eslint-disable-next-line react/prop-types
    value,
    // eslint-disable-next-line react/prop-types
    type = "consolation-prize",
    // eslint-disable-next-line react/prop-types
    title = "Nth",
    // eslint-disable-next-line react/prop-types
    index,
  }) {
    const states = {
      "main-prize": {
        borderColor: "border-blue-500",
        textColor: "text-blue-800",
        backgroundColor: "bg-blue-50",
      },
      "consolation-prize": {
        borderColor: "border-green-600",
        textColor: "text-green-800",
        backgroundColor: "bg-green-50",
      },
    };
    return (
      <div id={index} className={`flex flex-col justify-center items-center`}>
        <h4 className={"font-open font-semibold text-base text-gray-800"}>
          {type === "main-prize" ? title : ""}
        </h4>
        <div
          className={`h-10 min-w-27 font-work font-bold text-[1.4rem] tracking-wider ${states[type].textColor} rounded-md flex flex-col justify-center items-center border-1 ${states[type].borderColor} ${states[type].backgroundColor}`}
        >
          {value}
        </div>
      </div>
    );
  }

  async function startRoll(final_num = "8157") {
    setIsNumberGenerated(false);
    return new Promise((resolve) => {
      let rolls = 0;
      let interval = setInterval(() => {
        if (rolls < 50) {
          let new_rolled_number_array = [
            ...randomNumber()
              .toString()
              .padStart(requirements.total_digits, "0"),
          ];
          setRollingNumber(new_rolled_number_array);
          rolls++;
        } else {
          clearInterval(interval);
          let finalArray = [...String(final_num)];
          setRollingNumber(finalArray);
          setIsNumberGenerated(true);
          resolve();
        }
      }, 100);
    });
  }

  async function systemProcess() {
    let totalConsolations = requirements["consolation_prize_count"];
    let totalMain = requirements["main_prize_count"];
    let totalPrizes = totalConsolations + totalMain;
    if (isCompletelyFilled) {
      await window.api.gameCompletedDialog();
    }
    if (!isConsolationFilled) {
      await setBox(Array(totalPrizes).fill(""));
      for (let i = totalPrizes - 1; i >= totalMain; i--) {
        let final_num = finalNumbers["consolationPrizeNumbers"][i - totalMain];
        await startRoll(final_num);
        setBox((prev) => {
          const newPrize = [...prev];
          newPrize[i] = final_num;
          return newPrize;
        });
        if (i === totalMain) {
          setIsConsolationFilled(true);
          setCurrentPrizeIndex(totalMain);
        }
      }
    } else {
      if (countMainFilled !== totalMain) {
        let final_num =
          finalNumbers["mainPrizeNumbers"][totalMain - countMainFilled - 1];
        await startRoll(final_num);
        setBox((prev) => {
          const newPrize = [...prev];
          newPrize[totalMain - countMainFilled - 1] = final_num;
          return newPrize;
        });
        if (countMainFilled === totalMain - 1) {
          setIsCompletelyFilled(true);
          await window.api.updatePrizesTable(finalNumbers);
          await window.api.updateCouponsTable(finalNumbers);
        }
        setCountMainFilled(countMainFilled + 1);
        setCurrentPrizeIndex(currentPrizeIndex - 1);
      }
    }
  }

  function getBoxDistribution(count, requirements) {
    let linesArray = [];
    let numberOfBoxes = getNumberOfBoxes(window.screen.width);
    let remainder = count % numberOfBoxes;
    let currentIndex = 0;

    if (remainder > 0) {
      linesArray.push({
        startIndex: currentIndex,
        count: remainder,
      });
      currentIndex += remainder;
    }

    while (currentIndex < count) {
      linesArray.push({
        startIndex: currentIndex,
        count: numberOfBoxes,
      });
      currentIndex += numberOfBoxes;
    }

    return linesArray;
  }

  useEffect(() => {
    window.api.loadImageDirectoryPath().then((result)=>{
      setImageDirectoryPath(result);
    })
    async function fetchFinalNumbers() {
      setIsWindowLoaded(false);
      return await window.api.getFinalNumbers();
    }

    async function fetchRequirements() {
      setIsWindowLoaded(false);
      return await window.api.getRequirements();
    }

    fetchRequirements()
      .then(async (result) => {
        setRequirements(result);
        const totalPrizes =
          result["main_prize_count"] + result["consolation_prize_count"];

        // Generate lines for main prizes
        const mainLines = getBoxDistribution(
          result["main_prize_count"],
          result,
        );
        setMainLines(mainLines);

        // Generate lines for consolation prizes
        const consolationLines = getBoxDistribution(
          result["consolation_prize_count"],
          result,
        );
        setConsolationLines(consolationLines);

        setBox(Array(totalPrizes).fill(""));
        setRollingNumber(Array(result["total_digits"]).fill("0"));
        setIsWindowLoaded(true);
        setCurrentPrizeIndex(result["main_prize_count"] + 1);
      })
      .finally(() => {
        fetchFinalNumbers().then((result) => {
          setFinalNumbers(result);
          setIsWindowLoaded(true);
        });
      });
  }, []);

  if (isWindowLoaded) {
    return (
      <main
        className={
          "w-screen h-screen flex flex-col items-center p-5 gap-5 relative bg-amber-50/30"
        }
      >
        {/* Header and controls remain the same */}
        <div
          className={
            "absolute right-3 w-full h-2 flex flex-row justify-end items-center gap-1"
          }
        >
          <button
            type={"button"}
            className={
              "cursor-pointer p-1.5 px-3 font-open font-semibold text-white text-xs rounded-md bg-neutral-700"
            }
            onClick={() => {
              navigate("/settings");
            }}
          >
            Go to Settings
          </button>
          <button
            className={
              "p-1.5 rounded-md bg-red-700 cursor-pointer px-2 text-xs font-open font-semibold text-white"
            }
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            className={"p-1.5 rounded-md bg-yellow-500 cursor-pointer"}
            onClick={handleMinimize}
          >
            <MdMinimize size={"1rem"} color={"black"} />
          </button>
        </div>

        {/* Title section remains the same */}
        <section
          className={
            "p-5 rounded-2xl flex flex-col items-center justify-center gap-2"
          }
        >
          <h1
            className={
              "p-2 px-5 font-poppins font-semibold text-white text-sm uppercase rounded-full flex flex-row gap-2 items-center justify-center bg-linear-to-r from-[#ff5733] to-[#c70039]"
            }
          >
            <BsTrophy size={"1rem"} color={"white"} /> Lucky DRAW
          </h1>
          <h1
            className={
              "h-[3rem] font-poppins text-[3rem] text-blue-600 tracking-wider font-extrabold uppercase flex flex-row justify-center items-center gap-8"
            }
          >
            <img src={imageDirectoryPath+"/image-left.png"} className={"object-contain h-16"} />
            {requirements["event_name"]}
            <img src={imageDirectoryPath+"/image-right.png"} className={"object-contain h-16"} />
          </h1>
        </section>

        {/* Number generator section remains the same */}
        <section
          id={"numberGenerator"}
          className={"w-full flex flex-row gap-6"}
        >
          <div className={"w-full h-20 flex justify-center items-center gap-4"}>
            {rollingNumber.map((value, index) => {
              return (
                <RollingNumberDigit value={rollingNumber[index]} key={index} />
              );
            })}
            <button
              onClick={async () => {
                isNumberGenerated ? await systemProcess() : "";
              }}
              className={
                "h-10 px-4 p-2 bg-green-500 font-bold font-open text-white text-md uppercase rounded-full cursor-pointer hover:bg-green-700 flex flex-row justify-center items-center gap-2 transition-all duration-200"
              }
            >
              <CiGift size={"1.5rem"} color={"white"} /> Prize No.
              {currentPrizeIndex}
            </button>
          </div>
        </section>

        <p
          className={
            "font-bold text-center text-md font-poppins uppercase text-gray-500"
          }
        >
          {isCompletelyFilled ? "Draw for all prizes has been over!" : ""}
        </p>

        {/* Main prize section with line-based layout */}
        <section
          id={"main-prize-section"}
          className={
            "w-[95%] p-3 border-1 border-gray-300 rounded-xl flex flex-col justify-center items-start gap-y-1"
          }
        >
          <h2
            className={
              "w-full font-bold text-left text-lg font-poppins uppercase text-blue-900"
            }
          ></h2>
          {mainLines.map((line, lineIndex) => (
            <div
              key={`main-${lineIndex}`}
              className={
                "w-full flex flex-row justify-center items-center gap-5 mb-4"
              }
            >
              {box
                .slice(line.startIndex, line.startIndex + line.count)
                .map((value, index) => (
                  <NumberBox
                    value={value}
                    type={"main-prize"}
                    title={`${line.startIndex + index + 1}`}
                    key={`main-${line.startIndex + index}`}
                    index={line.startIndex + index}
                  />
                ))}
            </div>
          ))}
        </section>

        {/* Consolation prize section with line-based layout */}
        <section
          id={"consolation-prize-section"}
          className={
            "p-5 w-[95%] border-1 border-gray-300 rounded-xl min-h-[20%] flex flex-col justify-center items-start gap-3"
          }
        >
          <h2
            className={
              "p-1 w-full font-bold text-left text-lg font-poppins uppercase text-orange-900"
            }
          >
            Other Attractions:
          </h2>
          {consolationLines.map((line, lineIndex) => (
            <div
              key={`consolation-${lineIndex}`}
              className={
                "p-1 w-full flex flex-row justify-center items-center gap-5"
              }
            >
              {box
                .slice(
                  line.startIndex + requirements["main_prize_count"],
                  line.startIndex +
                    line.count +
                    requirements["main_prize_count"],
                )
                .map((value, index) => (
                  <NumberBox
                    value={value}
                    type={"consolation-prize"}
                    key={`consolation-${line.startIndex + index}`}
                    index={
                      line.startIndex + index + requirements["main_prize_count"]
                    }
                  />
                ))}
            </div>
          ))}
        </section>
      </main>
    );
  } else {
    return (
      <main
        className={"w-screen h-screen flex justify-center items-center p-5"}
      >
        <h1 className={"text-3xl text-gray-400 font-poppins font-bold"}>
          Waiting for Data...
        </h1>
      </main>
    );
  }
}

export default GameWindow;
