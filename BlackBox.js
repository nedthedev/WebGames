import Swal from 'sweetalert2'

/**
 * Get a random hex color
 * @returns a hex string representation of the color
 */
const randomColor = () => {
  return '#'+(Math.random()*0xFFFFFF<<0).toString(16)+'aa'
}

/**
 * Determine if the ray is still inside the grid
 * @param {Number} index the current position of the ray
 * @param {Number} limit the out of bounds condition for the grid
 * @returns true if ray is still inside the grid, otherwise false
 */
const rayFunctionLimit = (index, limit) => {
  if(limit === 0) {
    if(index > 0) {
      return true
    } return false
  } else {
    if(index < limit) {
      return true
    } return false
  }
}

/**
 * Called to cast a ray up or down
 * @param {Array} grid the state grid, need not be mutable
 * @param {Number} row the row to begin the cast
 * @param {Number} col the col to begin the cast
 * @param {Number} offset -1 for traveling up, +1 for traveling down
 * @returns an object in the form { row, col, result }, where row and col
 * represent the coordinates the ray exits the grid, and result is the type of 
 * ray it is ('HIT', 'REF', '')
 */
const rayGoVertical = (grid, row, col, offset) => {
  let verticalLeft, verticalRight, verticalMiddle = null
  let nRow = row
  let nCol = col
  let limit = offset > 0 ? grid.length-1 : 0
  while(rayFunctionLimit(nRow, limit)) {
    verticalLeft = getPosition(grid, nRow+offset, nCol-1)
    verticalRight = getPosition(grid, nRow+offset, nCol+1)
    verticalMiddle = getPosition(grid, nRow+offset, nCol)
    if(verticalMiddle.hasBall) {
      return { row: row, col: col, result: 'HIT' }
    } else if(verticalLeft.hasBall) {
      if(verticalRight.hasBall) {
        return { row: row, col: col, result: "REF" }
      } else {
        if(grid[nRow][nCol].type === 'edge') {
          return { row: row, col: col, result: "REF" }
        } else {
          return rayGoHorizontal(grid, nRow, nCol, 1)
        }
      }
    } else if(verticalRight.hasBall) {
      if(grid[nRow][nCol].type === 'edge') {
        return { row: row, col: col, result: "REF" }
      } else {
        return rayGoHorizontal(grid, nRow, nCol, -1)
      }
    } else {
      nRow+=offset
    }
  } return { row: nRow, col: nCol, result: '' }
}

/**
 * Called to cast a ray left or right
 * @param {Array} grid the state grid, need not be mutable
 * @param {Number} row the row to begin the cast
 * @param {Number} col the col to begin the cast
 * @param {Number} offset -1 for traveling left, +1 for traveling right
 * @returns an object in the form { row, col, result }, where row and col
 * represent the coordinates the ray exits the grid, and result is the type of 
 * ray it is (HIT, REF, )
 */
const rayGoHorizontal = (grid, row, col, offset) => {
  let horizontalUp, horizontalMiddle, horizontalDown = null
  let nRow = row
  let nCol = col
  let limit = offset > 0 ? grid.length-1 : 0
  while(rayFunctionLimit(nCol, limit)) {
    horizontalUp = getPosition(grid, nRow-1, nCol+offset)
    horizontalDown = getPosition(grid, nRow+1, nCol+offset)
    horizontalMiddle = getPosition(grid, nRow, nCol+offset)
    if(horizontalMiddle.hasBall) {
      return { row: row, col: col, result: 'HIT' }
    } else if(horizontalUp.hasBall) {
      if(horizontalDown.hasBall) {
        return { row: row, col: col, result: "REF" }
      } else {
        if(grid[nRow][nCol].type === 'edge') {
          return { row: row, col: col, result: "REF" }
        } else {
          return rayGoVertical(grid, nRow, nCol, 1)
        }
      }
    } else if(horizontalDown.hasBall) {
      if(grid[nRow][nCol].type === 'edge') {
        return { row: row, col: col, result: "REF" }
      } else {
        return rayGoVertical(grid, nRow, nCol, -1)
      }
    } else {
      nCol+=offset
    }
  } return { row: nRow, col: nCol, result: '' }
}

/**
 * Get the state's grid object from the given coordinates, if it doesn't exist
 * then return a basic object { hasBall: false }
 * @param {Array} grid the state grid instance
 * @param {Number} row the row to fetch
 * @param {Number} col the col to fetch
 * @returns the object stored at the given coordinates
 */
const getPosition = (grid, row, col) => {
  if(row >= 0 && row <= grid.length-1 && col >= 0 && col <= grid.length-1) {
    return grid[row][col]
  } else {
    return { hasBall: false }
  }
}

const state = {
  gameStarted: false,
  ballsPlaced: 0,
  grid: null,
  showingAnswers: false,
  guessBalls: [],
  edgeColors: [],
  easyDimensions: 6,
  normalDimensions: 8,
  hardDimensions: 10,
  raysCast: 0,
  boardHeight: 0,
  gamesPlayed: 0,
}

const actions = { 
  /**
   * Cast a ray from the given coordinates
   */
  castRay({ state, commit }, { row, col }) {
    if(state.raysToCast !== 0 && !state.grid[row][col].hasRay && !state.showingAnswers) {
      commit("castRay", { row, col })
    }
  },
  /**
   * Toggle ball existence at the given coordinates
   */
  toggleBall({ state, commit }, { row, col }) {
    if(!state.showingAnswers) {
      commit("toggleBall", { row, col })
    }
  },
  /**
   * Check the player's answers
   */
  checkAnswers({ state, commit, dispatch }) {
    let gotItRight = true
    let ballsMissed = 0
    for(let index = 0; index < state.guessBalls.length; index++) {
      if(!state.guessBalls[index].hasBall) {
        gotItRight = false
        ballsMissed++
      }
    }
    commit("showAnswers")
    if(gotItRight) {
      Swal.fire({
        title: 'All Correct!',
        icon: 'success',
        position: 'center',
        background: '#0e1011',
        confirmButtonColor: '#3298dc',
        showCancelButton: true,
        confirmButtonText: 'Play Again',
        showCloseButton: true
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch("startNewGame", state.dimensions)
        }
      })
    } else {
      let balls = ballsMissed > 1 ? 'balls' : 'ball'
      Swal.fire({
        title: 'Oh no!',
        text: `You missed ${ballsMissed} ${balls}!`,
        icon: 'error',
        toast: false,
        background: '#0e1011',
        position: 'center',
        showCloseButton: true,
        confirmButtonColor: '#3298dc',
        showCancelButton: true,
        confirmButtonText: 'Play Again',
      }).then((result) => {
        if (result.isConfirmed) {
          dispatch("startNewGame", state.dimensions)
        }
      })
    }
  },
  /**
   * Initialize a new game with the given dimensions
   * @param {Number} dimensions the width and height of the grid
   */
  async startNewGame({ commit, dispatch }, dimensions) {
    commit("startNewGame", dimensions)
    commit("setGrid", await dispatch("generateGrid"))
  },
  /**
   * Generates a new grid
   * @returns the new grid to save in the state
   */
  async generateGrid({ state, dispatch }) {
    var grid = []
    for (let row = 0; row < state.rows; row++) {
      var generatedRow = await dispatch("generateRow", { row })
      grid.push(generatedRow)
    }
    grid = await dispatch("placeBalls", { grid })
    grid = await dispatch("calculateRayPaths", { grid })
    return grid
  },
  /**
   * Create a new row to append to the grid
   * @returns the row array
   */
  async generateRow({ state }, { row }) {
    const generatedRow = []
    for (let col = 0; col < state.cols; col++) {
      let gridItem = { }
      if(col === 0 || col === state.cols - 1) {
        if(row === 0 || row === state.rows - 1) {
          gridItem = {
            type: "corner"
          }
        } else {
          gridItem = {
            type: "edge",
            hasRay: false,
            rayResult: null,
            rayOutput: null,
            direction: null
          }
          gridItem.direction = col === 0 ? 'right' : 'left'
        }
      } else if(row === 0 || row === state.cols - 1) {
        gridItem = {
          type: "edge",
          hasRay: false,
          rayResult: null,
          rayOutput: null,
          direction: null
        }
        gridItem.direction = row === 0 ? 'down' : 'up'
      } else {
        gridItem = {
          type: "ball",
          hasBall: false,
          hasGuessBall: false
        }
      }
      generatedRow.push(gridItem)
    }
    return generatedRow
  },
  /**
   * Programatically place balls throughout the grid
   * @returns the modified grid with balls placed
   */
  async placeBalls({ state }, { grid }) {
    let ballX, ballY, ballsPlaced = 0
    while(ballsPlaced != state.ballsToPlace) {
      ballX = Math.floor(Math.random() * state.dimensions + 1)
      ballY = Math.floor(Math.random() * state.dimensions + 1)
      if(!grid[ballY][ballX].hasBall) {
        grid[ballY][ballX].hasBall = true
        ballsPlaced++
      }
    }
    return grid
  },
  /**
   * Calculate the ray paths for each position and save them in the grid
   * @returns the modified grid with paths
   */
  async calculateRayPaths({ state }, { grid }) {
    var output = { }
    for(let row = 0; row <= state.dimensions + 1; row++) {
      for(let col = 0; col <= state.dimensions + 1; col++) {
        if(grid[row][col].type === "edge" && !grid[row][col].rayOutput) {
          switch(grid[row][col].direction) {
            case 'up':
              output = rayGoVertical(grid, row, col, -1)
              break
            case 'down':
              output = rayGoVertical(grid, row, col, 1)
              break
            case 'left':
              output = rayGoHorizontal(grid, row, col, -1)
              break
            case 'right':
              output = rayGoHorizontal(grid, row, col, 1)
              break
          }
          grid[row][col].rayOutput = { row: output.row, col: output.col }
          grid[row][col].rayResult = output.result
          grid[output.row][output.col].rayOutput = { row: row, col: col }
          grid[output.row][output.col].rayResult = output.result
        }
      }
    }
    return grid
  },
}

const mutations = {
  castRay(state, data) {
    state.gameStarted = true
    state.grid[data.row][data.col].hasRay = true
    document.getElementById(`edge${data.row}_${data.col}`).style.backgroundColor = state.edgeColors[0]
    if("" === state.grid[data.row][data.col].rayResult) {
      let output = state.grid[data.row][data.col].rayOutput
      state.grid[output.row][output.col].hasRay = true
      document.getElementById(`edge${output.row}_${output.col}`).style.backgroundColor = state.edgeColors[0]
    }
    state.edgeColors.splice(0, 1)
    state.raysToCast--
    state.raysCast++
  },
  setGrid(state, grid) {
    state.grid = grid
  },
  toggleBall(state, data) {
    if(state.grid[data.row][data.col].hasGuessBall) {
      state.grid[data.row][data.col].hasGuessBall = false
      for(let index = 0; index < state.guessBalls.length; index++) {
        if(state.guessBalls[index] === state.grid[data.row][data.col]) {
          state.guessBalls.splice(index, 1)
          state.ballsPlaced--
        }
      }
    } else if(state.ballsPlaced < state.ballsToPlace) {
      state.grid[data.row][data.col].hasGuessBall = true
      state.guessBalls.push(state.grid[data.row][data.col])
      state.ballsPlaced++
    }
    state.gameStarted = state.ballsPlaced === 0 && state.raysCast === 0 ? false : true
  },
  pushBall(state, data) {
    state.balls.push(data)
  },
  startNewGame(state, dimensions) {
    state.gameStarted = false
    state.dimensions = dimensions
    state.gamesPlayed++
    state.edgeColors = []
    let color = ''
    while(state.edgeColors.length <= state.dimensions) {
      color = randomColor()
      if(state.edgeColors.indexOf(color) === -1) {
        state.edgeColors.push(color)
      }
    }
    state.raysToCast = state.dimensions
    state.raysCast = 0
    state.ballsPlaced = 0
    state.ballsToPlace = Math.floor(state.dimensions / 2)
    state.rows = state.dimensions + 2
    state.cols = state.dimensions + 2
    state.grid = null
    state.showingAnswers = false
    state.guessBalls = []
  },
  showAnswers(state) {
    state.showingAnswers = true
  } 
}

const getters = {
  getRaysToCast(state) { return state.raysToCast },
  getBallsToPlace(state) { return state.ballsToPlace - state.ballsPlaced },
  getRaysCast(state) { return state.raysCast },
  getGrid(state) { return state.grid },
  stillRaysToCast(state) { return state.raysToCast > 0 },
  stillBallsToPlace(state) { return state.ballsPlaced !== state.ballsToPlace },
  hasCastRays(state) { return state.dimensions - state.raysToCast !== 0 },
  showingAnswers(state) { return state.showingAnswers },
  getDimensions(state) { return state.dimensions },
  getEasyDimensions(state) { return state.easyDimensions },
  getNormalDimensions(state) { return state.normalDimensions },
  getHardDimensions(state) { return state.hardDimensions },
  isEasy(state) { return state.dimensions === state.easyDimensions },
  isNormal(state) { return state.dimensions === state.normalDimensions },
  isHard(state) { return state.dimensions === state.hardDimensions },
  gameStarted(state) { return state.gameStarted },
  gamesPlayed(state) { return state.gamesPlayed }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
