/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import router from "../app/Router.js"
import * as mockStore from "../__mocks__/store.js"
import "@testing-library/jest-dom/extend-expect"
import store from "../app/Store.js"

describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  router()

  describe("When I am on NewBill Page", () => {
    const html = NewBillUI()
    document.body.innerHTML = html

    test("Then mail icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.NewBill)
      const mailIcon = await waitFor(() => screen.getByTestId('icon-mail'))
      expect(mailIcon).toHaveClass('active-icon')
    })

    test("Then the file should be accepted if it has a valid image extension", () => {
      const fileInput = screen.getByTestId("file")
      const validFile = new File(["image"], "test.jpg", { type: "image/jpg" })

      fireEvent.change(fileInput, {
        target: { files: [validFile] },
      })

      expect(fileInput.files[0].name).toEqual(validFile.name)
    })

    test("Then an error message should be displayed if the file has an invalid extension", () => {
      const fileInput = screen.getByTestId("file")
      const invalidFile = new File(["document"], "document.pdf", { type: "application/pdf" })

      fireEvent.change(fileInput, {
        target: { files: [invalidFile] },
      });

      const errorMessage = screen.getByTestId("file-error");
      expect(errorMessage).toHaveTextContent(
        "Seuls les fichiers au format JPG, JPEG ou PNG peuvent être chargés"
      )
      expect(fileInput.value).toBe("")
    })

    test('Then when I submit the form the handleSubmit method should create a new bill and navigate to Bills page', async () => {
      const newBill = new NewBill({
        document: document,
        onNavigate: window.onNavigate,
        store: mockStore.default,
        localStorage: window.localStorage,
      })

      const form = screen.getByTestId('form-new-bill')
      const handleSubmitSpy = jest.spyOn(newBill, 'handleSubmit')
      const onNavigateSpy = jest.spyOn(newBill, 'onNavigate')
      form.addEventListener("submit", handleSubmitSpy)

      fireEvent.submit(form)

      expect(handleSubmitSpy).toHaveBeenCalled()
      expect(onNavigateSpy).toHaveBeenCalledWith(ROUTES_PATH.Bills)
    })

  })

  //POST request integration tests
  describe("When I am on the NewBill page and I fill the form", () => {
    const html = NewBillUI()
    document.body.innerHTML = html

    const newBill = new NewBill({
      document: document,
      onNavigate: window.onNavigate,
      store: store,
      localStorage: window.localStorage,
    })
    const form = screen.getByTestId('form-new-bill')
    const handleSubmit = jest.spyOn(newBill, 'handleSubmit')
    const updateBill = jest.spyOn(newBill, 'updateBill')
    const onNavigate = jest.spyOn(newBill, 'onNavigate')
    form.addEventListener("submit", handleSubmit)


    test('Then a POST request is sent to the back-end to create the bill when I attach a file', async () => {
      const billsSpy = jest.spyOn(store, 'bills')
      const consoleSpy = jest.spyOn(console, 'log');
      const fileInput = screen.getByTestId("file")
      const validFile = new File(["image"], "image.jpg", { type: "image/jpg" })
      fireEvent.change(fileInput, {
        target: { files: [validFile] },
      })
      expect(billsSpy).toHaveBeenCalled()
      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('https://localhost:3456/images/test.jpg'))
    })

    test('Then a PATCH request is sent to the back-end with the rest of the bill data once I submit the form', () => {
      const mockUpdate = jest.fn(store.bills().update)
      store.bills.mockImplementationOnce(() => {
        return {
          update: mockUpdate
        }
      })
      const bill = { "type": "Hôtel et logement", "name": "Test bill", "amount": 100, "date": "1000-01-01", "vat": "10", "pct": 20, "commentary": "", "fileUrl": "https://localhost:3456/images/test.jpg", "fileName": "", "status": "pending" }
      //fill in all the fields
      fireEvent.change(screen.getByTestId('expense-type'), { target: { value: bill.type } })
      fireEvent.change(screen.getByTestId('expense-name'), { target: { value: bill.name } })
      fireEvent.change(screen.getByTestId('datepicker'), { target: { value: bill.date } })
      fireEvent.change(screen.getByTestId('amount'), { target: { value: bill.amount } })
      fireEvent.change(screen.getByTestId('vat'), { target: { value: bill.vat } })
      fireEvent.change(screen.getByTestId('pct'), { target: { value: bill.pct } })

      //submit the form
      fireEvent.submit(screen.getByTestId('form-new-bill'))

      expect(updateBill).toHaveBeenCalled()
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.Bills)

      //check that the
      expect(mockUpdate).toHaveBeenCalledWith({ "data": JSON.stringify(bill), "selector": "1234"})
    })

    test('Then if the back end returns an error when creating the bill, it is logged to the console', async () => {
      const error500 = new Error("Error 500")
      
      store.bills.mockImplementationOnce(() => {
        return {
          create: () => {
            return Promise.reject(error500)
          }
        }
      })
      const consoleSpy = jest.spyOn(console, 'error');
      const fileInput = screen.getByTestId("file")
      const validFile = new File(["image"], "image.jpg", { type: "image/jpg" })
      fireEvent.change(fileInput, {
        target: { files: [validFile] },
      })
      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(error500))
    })

    test('Then if the back end returns an error when updating the bill, it is logged to the console', async () => {
      const error404 = new Error("Error 404")
      
      store.bills.mockImplementationOnce(() => {
        return {
          update: () => {
            return Promise.reject(error404)
          }
        }
      })
      const consoleSpy = jest.spyOn(console, 'error');
      fireEvent.submit(screen.getByTestId('form-new-bill'))

      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(error404))
    })
  })
})
