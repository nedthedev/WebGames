import Swal from 'sweetalert2'

const state = {
  gameDifficulty: 'Normal',
  width: 4,
  height: 3,
  values: [],
  maxValue: 12,
  grid: [],
  hints: 3,
  gamesPlayed: 0
}

/**
 * Get a list of values from 1 to the specified max value
 * @param {Number} maxValue the max value for the puzzle
 * @returns a list of values from 1 to maxValue
 */
const valueRange = (maxValue) => {
  let values = []
  for(let i = 1; i <= maxValue; i++) {
    values.push(i)
  } return values
}

/**
 * Clone the given array
 * @param {Array} array the array to be cloned
 * @returns a cloned copy of the given array
 */
const cloneArray = (array) => {
  let clone = []
  for(let index = 0; index < array.length; index++) {
    clone.push(array[index])
  } return clone
}

const actions = { 
  /**
   * Begins a new game
   */
  async startNewGame({ state, commit, dispatch }, { width, height, difficulty }) {
    commit("startNewGame", { width, height, difficulty })
    let grid = await dispatch("createPuzzle", { values: cloneArray(state.values) })
    grid = await dispatch("giveHints", { grid })
    commit("setGrid", grid)
  },
  /**
   * Creates the puzzle by inserting the values into the grid
   * @returns a modified grid with values inserted
   */
  async createPuzzle({ state }, { values }) {
    let grid = []
    let bottomRow = []
    let rowArray, sum
    let valueIndex = null
    for(let row = 0; row < state.height; row++) {
      rowArray = []
      sum = 0
      for(let col = 0; col < state.width; col++) {
        valueIndex = Math.floor(Math.random() * values.length)
        sum += values[valueIndex]
        if(!bottomRow[col]) {
          bottomRow[col] = { 'value': 0, 'visible': true, 'type': 'sum' }
        }
        bottomRow[col].value += values[valueIndex]
        rowArray.push({ 'value': values[valueIndex], 'visible': false })
        values.splice(valueIndex, 1)
      } 
      rowArray.push({ 'value': sum, 'visible': true, 'type': 'sum' })
      grid.push(rowArray)
    }
    bottomRow.push({ 'value': 0, 'visible': false, 'type': 'corner' })
    grid.push(bottomRow)
    return grid
  },
  /**
   * Reveal a few spots actual/correct values
   * @returns a modified grid with some of the values readily visible
   */
  async giveHints({ state }, { grid }) {
    let hints = 0
    while(hints < state.hints) {
      let row = Math.floor(Math.random() * state.height)
      let col = Math.floor(Math.random() * state.width)
      if(!grid[row][col].visible) {
        grid[row][col].visible = true
        hints++
      }
    } return grid
  },
  /**
   * Check the answers to the puzzle (called on every input)
   */
  checkAnswers({ state, dispatch, commit }) {
    let done = true
    let hasInput = false
    for(let row = 0; row < state.height; row++) {
      for(let col = 0; col < state.width; col++) {
        if(document.getElementById(`value${row}_${col}`)) {
          if(Number(document.getElementById(`value${row}_${col}`).value) !== state.grid[row][col].value) {
            done = false
          }
          if(document.getElementById(`value${row}_${col}`).value !== '') {
            hasInput = true
          }
        }
      }
    }
    if(hasInput) commit("gameStarted", true)
    else commit("gameStarted", false)
    if(!done) return
    commit("gameComplete")
    Swal.fire({
      title: 'All Correct!',
      icon: 'success',
      background: '#0e1011',
      position: 'center',
      showCancelButton: true,
      confirmButtonText: 'Play Again',
      confirmButtonColor: '#3298dc',
      showCloseButton: true
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch("startNewGame", { width: state.width, height: state.height, difficulty: state.gameDifficulty })
      }
    })
  }
}

const mutations = {
  startNewGame(state, { width, height, difficulty }) {
    state.newGame = true
    state.width = width
    state.height = height
    state.gamesPlayed++
    state.gameComplete = false
    state.gameDifficulty = difficulty
    if(state.values.length !== width * height) {
      state.values = valueRange(state.width * state.height)
    }
    state.maxValue = state.width * state.height
    state.hints = state.maxValue * .165
    state.gameStarted = false
  },
  setGrid(state, grid) {
    state.grid = grid
  },
  gameComplete(state) {
    state.gameComplete = true
  },
  gameStarted(state, status) {
    state.gameStarted = status
  }
}

const getters = {
  getWidth(state) { return state.width },
  getHeight(state) { return state.height },
  getGrid(state) { return state.grid },
  isEasy(state) { return state.gameDifficulty === 'Easy' },
  isNormal(state) { return state.gameDifficulty === 'Normal' },
  isHard(state) { return state.gameDifficulty === 'Hard' },
  getDifficulty(state) { return state.gameDifficulty },
  gameComplete(state) { return state.gameComplete },
  gameStarted(state) { return state.gameStarted },
  gamesPlayed(state) { return state.gamesPlayed },
  getMaxValue(state) { return state.maxValue },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
