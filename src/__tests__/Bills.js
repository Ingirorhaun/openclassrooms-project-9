/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import Bills from "../containers/Bills.js"
import "@testing-library/jest-dom/extend-expect"
import store from "../__mocks__/store.js"

import router from "../app/Router.js"

describe("Given I am connected as an employee", () => {
  const onNavigate = pathname => {
    document.body.innerHTML = ROUTES({ pathname })
  }

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.append(root)
    router()
  })

  describe("When I am on Bills Page", () => {

    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      const windowIcon = await waitFor(() => screen.getByTestId('icon-window'))
      expect(windowIcon).toHaveClass('active-icon')

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test('Then the eye icon of each bill should open a modal which shows the image file attached to the bill', () => {
      //mock bootstrap's modal function to avoid importing the whole library in jest setup file
      $.fn.modal = jest.fn()
      const modalFnSpy = jest.spyOn($.fn, 'modal')

      const billsClass = new Bills({ document, onNavigate: onNavigate, store: store, data: bills, localStorage: localStorageMock })
      const icon = screen.getAllByTestId('icon-eye')[0]
      expect(icon).toBeInTheDocument()
      const modal = document.getElementById('modaleFile')
      icon.click()

      expect(modalFnSpy).toHaveBeenCalledWith('show')
      const image = modal.getElementsByTagName('img')[0]
      expect(image).toHaveAttribute('src', icon.getAttribute('data-bill-url'))

    })

    test('Then the new bill button should redirect to the new bill page', async () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const billsClass = new Bills({ document, onNavigate: onNavigate, store: store, data: bills, localStorage: localStorageMock })
      const handleClickNewBillSpy = jest.spyOn(billsClass, 'handleClickNewBill')
      const onNavigateSpy = jest.spyOn(billsClass, 'onNavigate')
      const newBillButton = screen.getByTestId('btn-new-bill')
      expect(newBillButton).toBeInTheDocument()
      newBillButton.addEventListener('click', billsClass.handleClickNewBill)

      newBillButton.click()
      expect(handleClickNewBillSpy).toHaveBeenCalled()
      expect(onNavigateSpy).toHaveBeenCalledWith(ROUTES_PATH.NewBill)
    })

    //GET request integration tests
    test('Then the bills should be fetched from the API', async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      const table = await waitFor(()=>screen.getByTestId('tbody'))
      expect(table.getElementsByTagName('tr').length).toEqual(4)
    })

    test('Then if the back end returns an error, it is shown to the user', async () => {
      const error500 = new Error("Erreur 500")
      
      store.bills = jest.fn(store.bills).mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(error500)
          }
        }
      })
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => expect(screen.getByText(/Erreur 500/)).toBeInTheDocument())
    })
  })
})
