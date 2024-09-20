import Swal from 'sweetalert2'

const state = {
  width: 12,
  height: 12,
  numMines: 30,
  difficulty: 'Normal',
  flagsPlaced: 0,
  spotsClicked: 0,
  gameOver: true,
  spotsToClick: 0,
  canClickFlag: false,
  wins: 0,
  losses: 0,
  flagAll: false,
  gamesPlayed: 0,
  gameStarted: false,
  timerInterval: null,
  timePassed: 0,
  firstClick: { },
  bombPercentage: 0.20625,
}

/**
 * Increment neighbors' minesAround count
 * @param {Array} grid the soon to be state's grid for manipulation
 * @param {Number} r the row index of the new spot with the mine
 * @param {Number} c the column index of the new spot with the mine
 * @returns the changed grid
 */
const incrementNeighbors = (grid, r, c) => {
  for(let row = r-1; row <= r+1; row++) {
    if(grid[row]) {
      for(let col = c-1; col <= c+1; col++) {
        if(grid[row][col]) {
          grid[row][col].minesAround++
        }
      }
    }
  } return grid
}

/**
 * Basic logic function that computes the number of neighbors with no mines, used for deciding where to make first click
 * @param {Array} grid the state's grid used for checking values
 * @param {Number} r the row index to check
 * @param {Number} c the column index to check
 * @returns a number representing the number of neighbors with no mines around them
 */
const calculateZerosAround = (grid, r, c) => {
  let zerosAround = 0
  for(let row = r-1; row <= r+1; row++) {
    if(grid[row]) {
      for(let col = c-1; col <= c+1; col++) {
        if(grid[row][col] && grid[row][col].minesAround === 0) {
          zerosAround++
        }
      }
    }
  } return zerosAround
}

const actions = {
  /**
   * Called to initialize the game state and do essential functions for creating a new game
   * @param {Number} width the width of the grid
   * @param {Number} height the height of the grid 
   * @param {String} difficulty a string representing the difficulty
   * @param {Number} mines a number representing the number of mines desired to be present in the grid, if it's 0 or < 0 then it uses default computed value
   */
  async startNewGame({ state, commit, dispatch }, { width, height, difficulty, mines=-1 }) {
    commit("startNewGame", { width, height, difficulty, mines })
    let grid = await dispatch("createGrid")
    grid = await dispatch("placeMines", { grid: grid, numMines: state.numMines })
    commit("setGrid", grid)
    dispatch("makeFirstClick")
    if(state.flagAll) dispatch("flagAll", true)
    commit("stopTimer")
    dispatch("startTimer")
  },
  /**
   * Makes the first click on the grid to the get the player started. It searches through the grid for the best options i.e. spots with a lots of neighboring spots with no mines. It will then click this spot, which will flood fill, providing a decent starting point.
   */
  makeFirstClick({ state, dispatch }) {
    let bestOption = null
    let mostZeros = 0
    let tmpMostZeros = 0
    for(let row = 0; row < state.height; row++) {
      for(let col = 0; col < state.width; col++) {
        if(state.grid[row][col].minesAround === 0) {
          tmpMostZeros = calculateZerosAround(state.grid, row, col)
          if(tmpMostZeros > mostZeros) {
            mostZeros = tmpMostZeros
            bestOption = { row: row, col: col }  
          }
        }
      }
    }
    if(bestOption !== null) dispatch("clickSpot", { row: bestOption.row, col: bestOption.col })
    else { 
      let fallback = null
      let randomRow, randomCol
      while(fallback === null) {
        randomRow = Math.floor(Math.random() * state.height)
        randomCol = Math.floor(Math.random() * state.width)
        if(!state.grid[randomRow][randomCol].hasMine) fallback = { row: randomRow, col: randomCol }
      }
      dispatch("clickSpot", { row: fallback.row, col: fallback.col })
    }
  },
  /**
   * Creates the 2D array that will be used as the grid and sets each spots initial state
   */
  async createGrid({ state }) {
    let grid = []
    for(let row = 0; row < state.height; row++) {
      let newRow = []
      for(let col = 0; col < state.width; col++) {
        newRow.push({ 
          hasMine: false,
          hasFlag: false,
          clicked: false,
          minesAround: 0,
        })
      } grid.push(newRow)
    } return grid
  },
  /**
   * Dynamically places mines throughout the grid
   * @param {Number} numMines the number of mines to place throughout the grid
   */
  async placeMines({ state }, { grid, numMines }) {
    let minesPlaced = 0
    while(minesPlaced < numMines) {
      let row = Math.floor(Math.random() * state.height)
      let col = Math.floor(Math.random() * state.width)
      if(!grid[row][col].hasMine) {
        grid[row][col].hasMine = true
        minesPlaced++
        grid = incrementNeighbors(grid, row, col)
      }
    } return grid
  },
  /**
   * Toggles the existence of a flag at grid[row][col]
   * @param {Number} row the row index of the spot to click
   * @param {Number} col the column index of the spot to click 
   */
  async toggleFlag({ state, commit }, { row, col }) {
    if(!state.gameOver && !state.grid[row][col].clicked) commit("toggleFlag", { row, col })
  },
  /**
   * Called when clicking a spot. Will set the grid[row][col].clicked to true and check for gameover scenarios
   * @param {Number} row the row index of the spot to click
   * @param {Number} col the column index of the spot to click 
   */
  async clickSpot({ state, commit, dispatch }, { row, col, clickFlag=false }) {
    if(!state.gameOver && (!state.grid[row][col].hasFlag || (state.canClickFlag || clickFlag)) && !state.grid[row][col].clicked) {
      if(state.grid[row][col].hasFlag) {
        commit("toggleFlag", { row, col })
      }
      commit("clickSpot", { row, col })
      if(state.grid[row][col].hasMine) {
        commit("stopTimer")
        dispatch("fireSwal", false)
        commit("gameOver", false)
      } else {
        if(state.spotsClicked === state.spotsToClick) {
          commit("stopTimer")
          dispatch("fireSwal", true)
          commit("gameOver", true)
        } else {
          if(state.grid[row][col].minesAround === 0) {
            dispatch("floodFill", { r: row, c: col })
          }
        }
      }
    }
    commit("gameStarted")
  },
  async startTimer({ commit }) {
    // set time passed to 0
    commit("resetTimer")
    // start the interval
    state.timerInterval = setInterval(() => (commit("incrementTimePassed")), 1000)
  },
  /**
   * Called when clicking on a spot with no neighboring mines. It will look for neighboring spots with no mines and click them as well, flooding the grid. It will continue to the edges clicking all spots enclosing the mineless spots.
   * @param {Number} r the row index of the spot to click
   * @param {Number} c the column index of the spot to click
   */
  async floodFill({ state, dispatch }, { r, c }) {
    let zeros = []
    zeros.push({ row: r, col: c })
    while(zeros.length > 0) {
      let item = zeros[0]
      for(let row = item.row-1; row <= item.row+1; row++) {
        if(state.grid[row]) {
          for(let col = item.col-1; col <= item.col+1; col++) {
            if(state.grid[row][col]) {
              if(!state.grid[row][col].hasMine && !state.grid[row][col].clicked) {
                dispatch("clickSpot", { row, col, clickFlag: true })
                if(state.grid[row][col].minesAround === 0) {
                  zeros.push({row: row, col: col})
                }
              }
            }
          }
        }
      }
      zeros.splice(0, 1)
    }
  },
  /**
   * Place flags on all the spots
   */
  flagAll({ state, dispatch, commit }, allFlags) {
    for(let row = 0; row < state.height; row++) {
      for(let col = 0; col < state.width; col++) {
        dispatch("toggleFlag", { row, col })
        commit("flagAll", allFlags)
      }
    }
  },
  setCanClickFlag({ commit }, canClickFlag) {
    commit("setCanClickFlag", canClickFlag)
  },
  /**
   * Fires a sweet alert notification telling the player whether they won or not
   * @param {Boolean} success whether or not to show the game won swal or the game lost swal
   */
  async fireSwal({ commit, dispatch }, success) {
    if(!success) {
      commit("gameWon", false)
      Swal.fire({
        title: 'Oh no!',
        text: `You exploded!`,
        icon: 'error',
        toast: false,
        background: '#0e1011',
        position: 'center',
        confirmButtonColor: '#3298dc',
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: 'Play Again',
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch("startNewGame", { width: state.width, height: state.height, difficulty: state.difficulty, mines: state.numMines })
        }
      })
    } else {
      commit("gameWon", true)
      Swal.fire({
        title: 'You did it!',
        text: `You defused the mine field!`,
        icon: 'success',
        toast: false,
        background: '#0e1011',
        position: 'center',
        confirmButtonColor: '#3298dc',
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: 'Play Again',
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch("startNewGame", { width: state.width, height: state.height, difficulty: state.difficulty, mines: state.numMines })
        }
      })
    }
  }
}

const mutations = {
  startNewGame(state, { width, height, difficulty, mines=-1 }) {
    state.width = width
    state.height = height
    state.difficulty = difficulty
    state.gameStarted = false
    state.flagsPlaced = 0
    state.spotsClicked = 0
    state.gameOver = false
    state.gameWon = false
    state.firstClick = { }
    state.gamesPlayed++
    state.spotsToClick = width * height
    if(mines <= 0 || mines >= state.spotsToClick) state.numMines = Math.ceil(state.spotsToClick * state.bombPercentage)
    else state.numMines = mines
    state.minesLeft = state.numMines
    state.spotsToClick -= state.numMines
  },
  setGrid(state, grid) {
    state.grid = grid
  },
  gameWon(state, value) {
    state.gameWon = value
  },
  toggleFlag(state, { row, col, override }) {
    if(state.grid[row][col].hasFlag) {
      state.flagsPlaced--
      state.grid[row][col].hasFlag = !state.grid[row][col].hasFlag
      state.minesLeft = state.numMines - state.flagsPlaced 
    } else {
      // if(state.minesLeft > 0) {
      if(override != null) {
        if(override) {
          state.grid[row][col].hasFlag = true
        } else {
          state.grid[row][col].hasFlag = false
        }
      } else {
        state.flagsPlaced++
        state.grid[row][col].hasFlag = !state.grid[row][col].hasFlag
        state.minesLeft = state.numMines - state.flagsPlaced 
      }
      // }
    }
  },
  removeBomb(state, { row, col }) {
    state.grid[row][col].hasMine = false
  },
  resetTimer(state) {
    // reset the timer
    state.timePassed = 0
  },
  stopTimer(state) {
    clearInterval(state.timerInterval)
  },
  incrementTimePassed(state) {
    if(state.timePassed < 999) state.timePassed++
  },
  clickSpot(state, { row, col }) {
    state.grid[row][col].clicked = true
    state.spotsClicked++
  },
  gameStarted(state) {
    state.gameStarted = true
  },
  gameOver(state, win) {
    if(win) state.wins++
    else state.losses++
    state.gameOver = true
  },
  setCanClickFlag(state, canClickFlag) {
    state.canClickFlag = canClickFlag
  },
  flagAll(state, allFlags) {
    state.flagAll = allFlags
  }
}

const getters = {
  getFlagsPlaced(state) { return state.flagsPlaced },
  getWidth(state) { return state.width },
  getHeight(state) { return state.height },
  getDifficulty(state) { return state.difficulty },
  getGrid(state) { return state.grid },
  gameOver(state) { return state.gameOver },
  gamesPlayed(state) { return state.gamesPlayed },
  isEasy(state) { return state.difficulty === 'Easy' },
  isNormal(state) { return state.difficulty === 'Normal' },
  isHard(state) { return state.difficulty === 'Hard' },
  isCustom(state) { return state.difficulty === 'Custom' },
  gameStarted(state) { return state.gameStarted },
  getWins(state) { return state.wins },
  getLosses(state) { return state.losses },
  gameWon(state) { return state.gameWon },
  getMines(state) { return state.numMines },
  canClickFlag(state) { return state.canClickFlag },
  getTimePassed(state) {
    if(state.timePassed < 10) return `000${state.timePassed}`
    else if(state.timePassed < 100) return `00${state.timePassed}`
    else if(state.timePassed < 1000) return `0${state.timePassed}`
    else return state.timePassed
  },
  minesLeft(state) { 
    if(state.minesLeft < -100) return "-" + Math.abs(state.minesLeft)
    else if(state.minesLeft < -10) return "-0" + Math.abs(state.minesLeft)
    else if(state.minesLeft < 0) return "-00" + Math.abs(state.minesLeft)
    else if(state.minesLeft < 10) return "000" + state.minesLeft
    else if(state.minesLeft < 100) return "00" + state.minesLeft
    else if(state.minesLeft < 1000) return "0" + state.minesLeft
    else return state.minesLeft
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
